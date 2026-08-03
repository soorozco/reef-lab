/* ═══════════════════════════════════════════════════════════════════════
   core.js — utilidades, estado persistente, catálogo de sales y fotos.
   ═══════════════════════════════════════════════════════════════════════ */

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* fecha local (no UTC): evita que después del mediodía se proponga el día siguiente */
const today = ()=>{ const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
const dOf = s=> new Date(s+'T12:00:00');
const fmt = (v,d=2)=> v==null||v===''||isNaN(v) ? '—' : (+v).toFixed(d);
const fmtDate = s=> s ? dOf(s).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtShort= s=> s ? dOf(s).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : '—';
const fmtDM   = s=> s ? dOf(s).toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'}) : '—';
const daysSince = s=> s ? Math.max(0, Math.round((dOf(today())-dOf(s))/864e5)) : null;
const agoTxt = s=>{ const d=daysSince(s); return d===0?'hoy':d===1?'ayer':`hace ${d} d`; };
const plural = (n,a,b)=> n===1?a:b;
const addDays = (s,n)=>{ const d=dOf(s); d.setDate(d.getDate()+n);
  return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
function toast(msg){ const t=$('#toast'); if(!t) return; t.textContent=msg; t.classList.add('on');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),3000); }

/* ── salinidad: ppt ↔ gravedad específica a 25 °C ── */
const pptASg = p=> 1 + p*0.00075;
const sgAPpt = g=> (g-1)/0.00075;

/* ═══════════════ catálogo de sales (§4) ═══════════════
   ap = aporte por gramo. Para 'alk' en meq; para 'ca'/'mg' en mg de ion.   */
const COMPUESTOS = {
  nahco3:{n:'Bicarbonato de sodio', tipo:'alk', fijo:true, corto:'bicarbonato',
    formas:{anhidro:{f:'NaHCO₃', mw:84.007, ap:11.904, n:'anhidro'}}},
  na2co3:{n:'Carbonato de sodio', tipo:'alk', fijo:true, corto:'soda ash',
    formas:{anhidro:{f:'Na₂CO₃', mw:105.988, ap:18.870, n:'anhidro'}}},
  cacl2:{n:'Cloruro de calcio', tipo:'ca', corto:'cloruro de calcio',
    formas:{hidratado:{f:'CaCl₂·2H₂O', mw:147.01, ap:272.6, pct:27.26, n:'dihidratado'},
            anhidro:  {f:'CaCl₂',      mw:110.98, ap:361.1, pct:36.11, n:'anhidro'}}},
  mgcl2:{n:'Cloruro de magnesio', tipo:'mg', corto:'cloruro de magnesio',
    formas:{hidratado:{f:'MgCl₂·6H₂O', mw:203.30, ap:119.6, pct:11.96, n:'hexahidratado'},
            anhidro:  {f:'MgCl₂',      mw:95.21,  ap:255.3, pct:25.53, n:'anhidro'}}},
  mgso4:{n:'Sulfato de magnesio', tipo:'mg', corto:'sulfato de magnesio',
    formas:{hidratado:{f:'MgSO₄·7H₂O', mw:246.47, ap:98.6,  pct:9.86,  n:'heptahidratado'},
            anhidro:  {f:'MgSO₄',      mw:120.37, ap:201.9, pct:20.19, n:'anhidro'}}},
};
const ESTADO_HID = {
  confirmado_hidratado:'Confirmado hidratado',
  confirmado_anhidro:'Confirmado anhidro',
  desconocido:'Sin confirmar',
};
const GRADOS = {
  alimenticio:'Alimenticio / USP', reactivo:'Reactivo',
  tecnico:'Técnico / industrial', desconocido:'Desconocido',
};
const TIPO_N = {alk:'Alcalinidad', ca:'Calcio', mg:'Magnesio'};
const PARTE_N = {A:'Parte A · alcalinidad', B:'Parte B · calcio', Mg:'Magnesio'};

/* ── parámetros medidos ── */
const PARAMS = [
  {k:'kh',   n:'Alcalinidad', ab:'KH',   u:'dKH',  min:7.0,  max:9.0,   dec:2, step:.05, ion:true,
   err:'±0.3–0.5 dKH en kit de titulación doméstico; no persigas décimas'},
  {k:'ca',   n:'Calcio',      ab:'Ca',   u:'ppm',  min:400,  max:450,   dec:0, step:1,   ion:true,
   err:'±10–20 ppm típico'},
  {k:'mg',   n:'Magnesio',    ab:'Mg',   u:'ppm',  min:1300, max:1400,  dec:0, step:5,   ion:true,
   err:'±30–50 ppm típico'},
  {k:'no3',  n:'Nitratos',    ab:'NO₃',  u:'ppm',  min:2,    max:10,    dec:2, step:.5,
   err:'±1–2 ppm en kits colorimétricos'},
  {k:'po4',  n:'Fosfatos',    ab:'PO₄',  u:'ppm',  min:0.03, max:0.10,  dec:3, step:.01,
   err:'±0.01–0.03 ppm; un Hanna ULR baja a ±0.01'},
  {k:'sal',  n:'Salinidad',   ab:'Sal',  u:'ppt',  min:34,   max:36,    dec:1, step:.1,
   err:'calibra el refractómetro con solución de 35 ppt, nunca con destilada'},
  {k:'temp', n:'Temperatura', ab:'Temp', u:'°C',   min:24,   max:27,    dec:1, step:.1},
  {k:'ph',   n:'pH',          ab:'pH',   u:'',     min:7.9,  max:8.4,   dec:2, step:.01},
];
const P = Object.fromEntries(PARAMS.map(p=>[p.k,p]));

const TIPOS   = {sps:'SPS', lps:'LPS', blando:'Blando', zoa:'Zoas', anemona:'Anémona', otro:'Otro'};
const ESTADOS = {excelente:'Excelente', bien:'Bien', regular:'Regular', estresado:'Estresado', rtn:'RTN / STN', perdido:'Perdido'};
const MALOS   = ['regular','estresado','rtn'];
const MANT    = {cambio:'Cambio de agua', osmosis:'Reposición de osmosis', dosif:'Dosificación puntual',
                 skimmer:'Limpieza de equipo', filtro:'Cambio de filtrante', luces:'Luces / fotoperiodo',
                 equipo:'Equipo', fauna:'Nuevo habitante', otro:'Otro'};
const GRUPOS  = {todo:null, cambios:['cambio','osmosis'], dosis:['dosif'], limpieza:['skimmer','filtro','equipo']};

/* ═══════════════ estado ═══════════════ */
const DEFAULTS = {
  settings:{
    nombre:'Mi arrecife',
    volumenBruto:175, volumenNeto:140,
    objetivos:{kh:8.0, ca:430, mg:1350, sal:35},
    targets:{},
    cambioSemanal:20,
    mgRatio:4.4,
    horaA:'08:00', horaB:'20:00', horaMg:'14:00',
    alertaDias:7,
    salUnidad:'ppt',
  },
  tests:[], salts:[], solutions:[], doses:[], maint:[], corals:[],
};

/* El estado vive en memoria y lo puebla db.js desde Supabase al iniciar sesión.
   save() también está en db.js: agenda la sincronización de lo que cambió. */
let S = null;

const V = ()=> +S.settings.volumenNeto || 1;
function tgt(k){
  const t = S.settings.targets[k];
  return { min: t && t.min!=null ? +t.min : P[k].min, max: t && t.max!=null ? +t.max : P[k].max };
}
const sortedTests = ()=> [...S.tests].sort((a,b)=> a.date < b.date ? 1 : -1);
function lastVal(k){ for(const t of sortedTests()){ const v=t.v[k]; if(v!=null && v!=='') return {v:+v, date:t.date}; } return null; }
function prevVal(k){ let n=0; for(const t of sortedTests()){ const v=t.v[k]; if(v!=null && v!==''){ n++; if(n===2) return {v:+v, date:t.date}; } } return null; }
function series(k, days){
  const cut = days ? Date.now()-days*864e5 : 0;
  return S.tests.filter(t=> t.v[k]!=null && t.v[k]!=='' && dOf(t.date)>=cut)
    .map(t=>({x:dOf(t.date).getTime(), y:+t.v[k], date:t.date}))
    .sort((a,b)=>a.x-b.x);
}
function status(k,v){
  if(v==null||isNaN(v)) return 'none';
  const {min,max}=tgt(k), r=Math.max(max-min, Math.abs(max)*0.1, 0.02);
  if(v>=min && v<=max) return 'ok';
  if(v < min-r*0.6 || v > max+r*0.6) return 'bad';
  return 'warn';
}
const isOff = st=> st==='bad' || st==='warn';

/* Las fotos van a Supabase Storage; el objeto Photos está en db.js. */

function fileToDataURL(file, maxDim=900, q=0.72){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        let {width:w,height:h}=img;
        const sc=Math.min(1, maxDim/Math.max(w,h));
        w=Math.round(w*sc); h=Math.round(h*sc);
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror=rej; img.src=fr.result;
    };
    fr.onerror=rej; fr.readAsDataURL(file);
  });
}
async function hydratePhotos(root=document){
  for(const el of $$('img[data-ph]', root)){
    const id=el.dataset.ph; el.removeAttribute('data-ph');
    const d=await Photos.get(id); if(d) el.src=d;
  }
}
