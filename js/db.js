/* ═══════════════════════════════════════════════════════════════════════
   db.js — Supabase: sesión con Google, carga, guardado y fotos.

   La app trabaja contra el objeto en memoria `S` con la misma forma de
   siempre; aquí se traduce esa forma a las tablas y de vuelta. `save()`
   agenda una sincronización que solo manda lo que cambió respecto a la
   última confirmada.
   ═══════════════════════════════════════════════════════════════════════ */

let sb = null;             /* cliente de Supabase */
let sesion = null;         /* sesión activa */
let instantanea = null;    /* último estado confirmado en la base */
let syncTimer = null;
let syncEnCurso = false;
let hayPendientes = false;

/* ── traducción entre la forma de la app y las columnas ── */
const MAP = {
  measurements: {
    tabla:'measurements', col:'tests',
    aFila: t => ({id:t.id, fecha:t.date, v:t.v||{}, kits:t.kits||{}, note:t.note||''}),
    aApp : r => ({id:r.id, date:r.fecha, v:r.v||{}, kits:r.kits||{}, note:r.note||''}),
  },
  salts: {
    tabla:'salts', col:'salts',
    aFila: s => ({id:s.id, compuesto:s.compuesto, estado:s.estado, grado:s.grado,
                  coa:!!s.coa, proveedor:s.proveedor||'', fecha_compra:s.fechaCompra||null}),
    aApp : r => ({id:r.id, compuesto:r.compuesto, estado:r.estado, grado:r.grado,
                  coa:!!r.coa, proveedor:r.proveedor||'', fechaCompra:r.fecha_compra||''}),
  },
  solutions: {
    tabla:'solutions', col:'solutions',
    aFila: s => ({id:s.id, nombre:s.nombre, salt_id:s.saltId, gramos:+s.gramos,
                  volumen_ml:+s.volumenMl, fecha:s.fecha, restante_ml:+s.restanteMl||0,
                  horneado:!!s.horneado}),
    aApp : r => ({id:r.id, nombre:r.nombre, saltId:r.salt_id, gramos:+r.gramos,
                  volumenMl:+r.volumen_ml, fecha:r.fecha, restanteMl:+r.restante_ml,
                  horneado:!!r.horneado}),
  },
  doses: {
    tabla:'doses', col:'doses',
    aFila: d => ({id:d.id, fecha:d.date, solution_id:d.solutionId, ml:+d.ml, correccion:!!d.correccion}),
    aApp : r => ({id:r.id, date:r.fecha, solutionId:r.solution_id, ml:+r.ml, correccion:!!r.correccion}),
  },
  maintenance: {
    tabla:'maintenance', col:'maint',
    aFila: m => ({id:m.id, fecha:m.date, tipo:m.tipo, cant:m.cant===''||m.cant==null?null:+m.cant,
                  unidad:m.unidad||'L', marca:m.marca||'', nota:m.nota||''}),
    aApp : r => ({id:r.id, date:r.fecha, tipo:r.tipo, cant:r.cant, unidad:r.unidad,
                  marca:r.marca||'', nota:r.nota||''}),
  },
  corals: {
    tabla:'corals', col:'__corals',
    aFila: c => ({id:c.id, nombre:c.nombre, especie:c.especie||'', tipo:c.tipo||'otro',
                  estado:c.estado||'bien', fecha:c.fecha||null, ubic:c.ubic||'',
                  nota:c.nota||'', photo:c.photo||null}),
    aApp : r => ({id:r.id, nombre:r.nombre, especie:r.especie||'', tipo:r.tipo, estado:r.estado,
                  fecha:r.fecha, ubic:r.ubic||'', nota:r.nota||'', photo:r.photo||null, log:[]}),
  },
  coral_log: {
    tabla:'coral_log', col:'__coralLog',
    aFila: l => ({id:l.id, coral_id:l.coralId, fecha:l.date, estado:l.estado||null,
                  talla:l.talla===''||l.talla==null?null:+l.talla, nota:l.nota||'', photo:l.photo||null}),
    aApp : r => ({id:r.id, coralId:r.coral_id, date:r.fecha, estado:r.estado,
                  talla:r.talla, nota:r.nota||'', photo:r.photo||null}),
  },
};

const AJUSTES_A_FILA = s => ({
  nombre:s.nombre, volumen_bruto:+s.volumenBruto, volumen_neto:+s.volumenNeto,
  objetivos:s.objetivos, targets:s.targets, cambio_semanal:+s.cambioSemanal,
  mg_ratio:+s.mgRatio, hora_a:s.horaA, hora_b:s.horaB, hora_mg:s.horaMg,
  alerta_dias:+s.alertaDias, sal_unidad:s.salUnidad,
});
const FILA_A_AJUSTES = r => ({
  nombre:r.nombre, volumenBruto:+r.volumen_bruto, volumenNeto:+r.volumen_neto,
  objetivos:r.objetivos, targets:r.targets||{}, cambioSemanal:+r.cambio_semanal,
  mgRatio:+r.mg_ratio, horaA:r.hora_a, horaB:r.hora_b, horaMg:r.hora_mg,
  alertaDias:+r.alerta_dias, salUnidad:r.sal_unidad,
});

/* aplana / anida la bitácora de corales */
function aplanarCorales(estado){
  const corals=[], log=[];
  for(const c of estado.corals||[]){
    const {log:l, ...resto}=c;
    corals.push(resto);
    for(const e of l||[]) log.push({...e, coralId:c.id});
  }
  return {corals, log};
}

/* ═══════════════ sesión ═══════════════ */
function iniciarCliente(){
  if(sb) return sb;
  if(!SUPABASE_LISTO) return null;
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce' },
  });
  return sb;
}
async function entrarConGoogle(){
  if(!iniciarCliente()) return;
  const { error } = await sb.auth.signInWithOAuth({
    provider:'google',
    options:{ redirectTo: location.origin + location.pathname },
  });
  if(error) mostrarPuerta('error', error.message);
}
async function salir(){
  if(!sb) return;
  await sb.auth.signOut();
  sesion=null; S=null; instantanea=null;
  location.reload();
}

/* ═══════════════ carga ═══════════════ */
async function cargarTodo(){
  const uid = sesion.user.id;
  const [aq, ...resto] = await Promise.all([
    sb.from('aquariums').select('*').eq('user_id',uid).maybeSingle(),
    sb.from('salts').select('*'),
    sb.from('solutions').select('*'),
    sb.from('measurements').select('*'),
    sb.from('doses').select('*'),
    sb.from('maintenance').select('*'),
    sb.from('corals').select('*'),
    sb.from('coral_log').select('*'),
  ]);
  const err = [aq,...resto].find(r=>r.error);
  if(err) throw new Error(err.error.message);

  const [salts, solutions, measurements, doses, maintenance, corals, coralLog] = resto.map(r=>r.data||[]);

  /* si el disparador de alta no corrió (usuario previo al esquema), sembramos */
  let ajustes;
  if(aq.data) ajustes = FILA_A_AJUSTES(aq.data);
  else {
    ajustes = structuredClone(DEFAULTS.settings);
    await sb.from('aquariums').upsert({user_id:uid, ...AJUSTES_A_FILA(ajustes)});
  }
  let sales = salts.map(MAP.salts.aApp);
  if(!sales.length){
    sales = salesPorDefecto();
    await sb.from('salts').upsert(sales.map(s=>({user_id:uid, ...MAP.salts.aFila(s)})));
  }

  const corales = corals.map(MAP.corals.aApp);
  const porId = Object.fromEntries(corales.map(c=>[c.id,c]));
  for(const r of coralLog){
    const e = MAP.coral_log.aApp(r);
    if(porId[e.coralId]) porId[e.coralId].log.push(e);
  }
  for(const c of corales) c.log.sort((a,b)=> a.date<b.date?-1:1);

  S = {
    settings: ajustes,
    salts: sales,
    solutions: solutions.map(MAP.solutions.aApp),
    tests: measurements.map(MAP.measurements.aApp),
    doses: doses.map(MAP.doses.aApp),
    maint: maintenance.map(MAP.maintenance.aApp),
    corals: corales,
  };
  instantanea = structuredClone(S);
}
function salesPorDefecto(){
  return Object.keys(COMPUESTOS).map(c=>({
    id:'sal_'+c, compuesto:c,
    estado: COMPUESTOS[c].fijo ? 'confirmado_anhidro' : 'desconocido',
    grado:'desconocido', coa:false, proveedor:'', fechaCompra:'',
  }));
}

/* ═══════════════ guardado ═══════════════
   save() solo agenda; sincronizar() manda lo que cambió.               */
function save(){
  if(!sb || !sesion){ return; }
  hayPendientes = true;
  marcarEstado('guardando');
  clearTimeout(syncTimer);
  syncTimer = setTimeout(sincronizar, 400);
}
function diferencias(prev, cur){
  const antes = new Map((prev||[]).map(x=>[x.id,x]));
  const ahora = new Map((cur ||[]).map(x=>[x.id,x]));
  const ups=[], dels=[];
  for(const [k,v] of ahora){
    const p=antes.get(k);
    if(!p || JSON.stringify(p)!==JSON.stringify(v)) ups.push(v);
  }
  for(const k of antes.keys()) if(!ahora.has(k)) dels.push(k);
  return {ups, dels};
}
async function sincronizar(){
  if(!sb || !sesion || syncEnCurso) return;
  syncEnCurso = true; hayPendientes = false;
  const uid = sesion.user.id;
  const objetivo = structuredClone(S);
  const base = instantanea || {settings:null, salts:[], solutions:[], tests:[], doses:[], maint:[], corals:[]};

  try{
    const ops=[];

    if(JSON.stringify(base.settings)!==JSON.stringify(objetivo.settings))
      ops.push(sb.from('aquariums').upsert({user_id:uid, ...AJUSTES_A_FILA(objetivo.settings)}));

    for(const clave of ['salts','solutions','measurements','doses','maintenance']){
      const m = MAP[clave];
      const {ups, dels} = diferencias(base[m.col], objetivo[m.col]);
      if(ups.length)  ops.push(sb.from(m.tabla).upsert(ups.map(x=>({user_id:uid, ...m.aFila(x)}))));
      if(dels.length) ops.push(sb.from(m.tabla).delete().in('id', dels));
    }

    const antesC = aplanarCorales(base), ahoraC = aplanarCorales(objetivo);
    const dc = diferencias(antesC.corals, ahoraC.corals);
    if(dc.ups.length)  ops.push(sb.from('corals').upsert(dc.ups.map(x=>({user_id:uid, ...MAP.corals.aFila(x)}))));
    const dl = diferencias(antesC.log, ahoraC.log);
    if(dl.ups.length)  ops.push(sb.from('coral_log').upsert(dl.ups.map(x=>({user_id:uid, ...MAP.coral_log.aFila(x)}))));
    if(dl.dels.length) ops.push(sb.from('coral_log').delete().in('id', dl.dels));
    /* los corales se borran al final: coral_log cuelga de ellos */
    if(dc.dels.length) ops.push(sb.from('corals').delete().in('id', dc.dels));

    if(ops.length){
      const res = await Promise.all(ops);
      const fallo = res.find(r=>r && r.error);
      if(fallo) throw new Error(fallo.error.message);
    }
    instantanea = objetivo;
    marcarEstado(hayPendientes ? 'guardando' : 'guardado');
  }catch(e){
    console.error('Error al sincronizar', e);
    hayPendientes = true;
    marcarEstado('error', e.message);
    toast('No se pudo guardar: ' + e.message);
  }finally{
    syncEnCurso = false;
    if(hayPendientes){ clearTimeout(syncTimer); syncTimer=setTimeout(sincronizar, 1500); }
  }
}
/* fuerza el envío antes de cerrar la pestaña */
window.addEventListener('beforeunload', e=>{
  if(hayPendientes || syncEnCurso){ e.preventDefault(); e.returnValue=''; }
});

function marcarEstado(estado, detalle){
  const el = $('#syncEstado');
  if(!el) return;
  const txt = {guardando:'Guardando…', guardado:'Guardado', error:'Sin guardar'}[estado] || '';
  el.textContent = txt;
  el.className = 'sync ' + estado;
  if(detalle) el.title = detalle;
}

/* ═══════════════ fotos en Supabase Storage ═══════════════ */
const Photos = (()=>{
  const urls = new Map();   /* ruta → URL firmada */
  return {
    async put(dataURL){
      const uid = sesion.user.id;
      const blob = await (await fetch(dataURL)).blob();
      const ruta = `${uid}/${uid.slice(0,8)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}.jpg`;
      const { error } = await sb.storage.from('fotos').upload(ruta, blob, {contentType:'image/jpeg', upsert:false});
      if(error){ toast('No se pudo subir la foto: '+error.message); return null; }
      urls.set(ruta, dataURL);   /* muestra la local mientras dure la sesión */
      return ruta;
    },
    async get(ruta){
      if(!ruta) return null;
      if(urls.has(ruta)) return urls.get(ruta);
      const { data, error } = await sb.storage.from('fotos').createSignedUrl(ruta, 3600);
      if(error || !data) return null;
      urls.set(ruta, data.signedUrl);
      return data.signedUrl;
    },
    async del(ruta){
      if(!ruta) return;
      urls.delete(ruta);
      await sb.storage.from('fotos').remove([ruta]);
    },
  };
})();

/* ═══════════════ puerta de acceso ═══════════════ */
function mostrarPuerta(modo, detalle){
  const g = $('#gate');
  const cuerpo = {
    cargando: `<div class="gate-t">Cargando tu acuario…</div>`,
    entrar: `
      <div class="gate-t">Entra para ver tu acuario</div>
      <div class="gate-d">Tus mediciones, soluciones y corales viven en tu cuenta. Entra con Google desde cualquier dispositivo y los verás igual.</div>
      <button class="btn btn-primary gate-btn" id="btnGoogle">ENTRAR CON GOOGLE</button>`,
    sinconfig: `
      <div class="gate-t">Falta conectar la base</div>
      <div class="gate-d">Todavía no están puestas la URL del proyecto y la clave anon de Supabase.
        Sigue los pasos de <b>SETUP.md</b> y pégalas en <b>js/config.js</b>.</div>`,
    sinred: `
      <div class="gate-t">Sin conexión</div>
      <div class="gate-d">Esta versión guarda todo en la nube, así que necesita internet para abrir.
        Revisa la señal y vuelve a intentar.</div>
      <button class="btn gate-btn" onclick="location.reload()">REINTENTAR</button>`,
    error: `
      <div class="gate-t">No se pudo cargar</div>
      <div class="gate-d">${esc(detalle||'')}</div>
      <button class="btn gate-btn" onclick="location.reload()">REINTENTAR</button>`,
  }[modo] || '';
  g.innerHTML = `<div class="gate-box"><div class="brand"><b>REEF LAB</b><i></i></div>${cuerpo}</div>`;
  g.classList.add('on');
  const b = $('#btnGoogle');
  if(b) b.onclick = entrarConGoogle;
}
function ocultarPuerta(){ $('#gate').classList.remove('on'); }

/* ═══════════════ arranque ═══════════════ */
async function arrancar(){
  if(!SUPABASE_LISTO) return mostrarPuerta('sinconfig');
  if(!navigator.onLine)  return mostrarPuerta('sinred');
  if(!window.supabase)   return mostrarPuerta('error','No cargó la librería de Supabase. Revisa tu conexión.');

  iniciarCliente();
  mostrarPuerta('cargando');

  const { data:{ session } } = await sb.auth.getSession();
  sesion = session;

  sb.auth.onAuthStateChange((evt, ses)=>{
    if(evt==='SIGNED_OUT'){ location.reload(); return; }
    if(ses && !sesion){ sesion=ses; iniciarSesion(); }
    else sesion = ses;
  });

  if(!sesion) return mostrarPuerta('entrar');
  await iniciarSesion();
}
async function iniciarSesion(){
  try{
    mostrarPuerta('cargando');
    await cargarTodo();
    await migrarDesdeLocal();
    ocultarPuerta();
    pintarUsuario();
    renderAll();
    marcarEstado('guardado');
  }catch(e){
    console.error(e);
    mostrarPuerta('error', e.message);
  }
}

/* ── rescate de la versión anterior ──
   Si en este navegador quedaron datos de cuando la app guardaba en
   localStorage, y la cuenta en la nube está vacía, ofrece subirlos.
   Las fotos viejas viven en IndexedDB y se resuben a Storage.          */
async function migrarDesdeLocal(){
  let viejo;
  try{ viejo = JSON.parse(localStorage.getItem('reeflab')||'null'); }catch(e){ return; }
  if(!viejo) return;
  const traeAlgo = (viejo.tests||[]).length || (viejo.solutions||[]).length || (viejo.corals||[]).length || (viejo.maint||[]).length;
  if(!traeAlgo) return;
  const nubeVacia = !S.tests.length && !S.solutions.length && !S.corals.length && !S.maint.length;
  if(!nubeVacia) return;

  const n = (viejo.tests||[]).length;
  if(!confirm(`Encontré datos guardados en este navegador de la versión anterior `
    + `(${n} ${plural(n,'medición','mediciones')}, ${(viejo.corals||[]).length} corales) y tu cuenta en la nube está vacía.\n\n`
    + `¿Los subo a tu cuenta?`)) return;

  const fotosViejas = await leerFotosLocales();
  const subida = {};
  for(const [id, dataURL] of Object.entries(fotosViejas)){
    const ruta = await Photos.put(dataURL);
    if(ruta) subida[id] = ruta;
  }
  const remapear = p => (p && subida[p]) || null;

  S.settings = Object.assign({}, S.settings, viejo.settings||{},
    {objetivos: Object.assign({}, S.settings.objetivos, (viejo.settings||{}).objetivos||{})});
  if((viejo.salts||[]).length) S.salts = viejo.salts.map(s=>({...s, fechaCompra:s.fechaCompra||''}));
  S.solutions = viejo.solutions||[];
  S.tests     = viejo.tests||[];
  S.doses     = viejo.doses||[];
  S.maint     = viejo.maint||[];
  S.corals    = (viejo.corals||[]).map(c=>({...c, photo:remapear(c.photo),
                  log:(c.log||[]).map(l=>({...l, photo:remapear(l.photo)}))}));

  save();
  localStorage.setItem('reeflab-migrado', new Date().toISOString());
  localStorage.removeItem('reeflab');
  toast('Datos de este navegador subidos a tu cuenta');
}
async function leerFotosLocales(){
  const out = {};
  for(const k of Object.keys(localStorage)){
    if(k.startsWith('reeflab-ph-')) out[k.slice(11)] = localStorage.getItem(k);
  }
  try{
    const db = await new Promise(res=>{
      const r = indexedDB.open('reeflab-photos',1);
      r.onsuccess=()=>res(r.result); r.onerror=()=>res(null);
      r.onupgradeneeded=()=>{ try{ r.result.createObjectStore('p'); }catch(e){} };
    });
    if(db && db.objectStoreNames.contains('p')){
      const store = db.transaction('p','readonly').objectStore('p');
      const claves = await new Promise(res=>{ const q=store.getAllKeys(); q.onsuccess=()=>res(q.result||[]); q.onerror=()=>res([]); });
      const vals   = await new Promise(res=>{ const q=store.getAll();     q.onsuccess=()=>res(q.result||[]); q.onerror=()=>res([]); });
      claves.forEach((k,i)=>{ if(vals[i]) out[k]=vals[i]; });
    }
  }catch(e){ /* sin fotos locales */ }
  return out;
}
function pintarUsuario(){
  const el = $('#usuario');
  if(!el || !sesion) return;
  const u = sesion.user;
  const nombre = u.user_metadata?.full_name || u.email || '';
  el.innerHTML = `<span class="meta" title="${esc(u.email||'')}">${esc(nombre.split(' ')[0]||'')}</span>
    <button class="lnk" id="btnSalir">Salir</button>`;
  $('#btnSalir').onclick = salir;
}
