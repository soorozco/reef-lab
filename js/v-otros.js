/* ═══════════════════════════════════════════════════════════════════════
   v-otros.js — Corales, Mantenimiento (§7.6), Calculadoras y Ajustes.
   ═══════════════════════════════════════════════════════════════════════ */

/* ───────────────────────── CORALES ───────────────────────── */
let coralFilter='todos';
function coralCard(c, compact){
  const lastLog = c.log?.length ? c.log[c.log.length-1] : null;
  const ph = (lastLog&&lastLog.photo) || c.photo;
  const d = daysSince(c.fecha), est = ESTADOS[c.estado]||'Bien';
  const malo = MALOS.includes(c.estado), sinReg = !c.log?.length;
  return `<button class="ccard ${c.estado==='perdido'?'lost':''}" data-coral="${c.id}">
    <div class="ph">${ph?`<img data-ph="${ph}" alt="">`:'<span>foto coral</span>'}</div>
    ${compact ? `
      <div class="nm" style="margin-top:10px;font-size:13px">${esc(c.nombre)}</div>
      <div class="sp" style="font-size:11.5px">${esc(c.especie||'—')}</div>
      <div class="ft" style="font-size:11px;color:var(--n500)">${TIPOS[c.tipo]||'Otro'} · ${d} D</div>
    ` : `
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:12px">
        <div class="nm">${esc(c.nombre)}</div><div class="spacer"></div><div class="tipo">${(TIPOS[c.tipo]||'Otro').toUpperCase()}</div>
      </div>
      <div class="sp">${esc(c.especie||'—')}</div>
      <div class="ft">
        <span class="${malo?'bad':''}">${sinReg&&c.estado!=='perdido'?'<span class="bad">Sin registro</span>':est}</span>
        <span class="dim">${d} d</span><span class="spacer"></span><span class="dim">${c.log?.length||0} reg.</span>
      </div>`}
  </button>`;
}
function renderCoralStrip(){
  const cs = S.corals.filter(c=>c.estado!=='perdido').slice(-6).reverse();
  if(!cs.length) return '';
  return `<div class="sec last" style="border-top:2px solid var(--divider)">
    <div class="row"><div class="h-sec">Corales</div><div class="spacer"></div>
      <button class="lnk" data-tabgo="corales">VER LOS ${S.corals.filter(c=>c.estado!=='perdido').length} →</button></div>
    <div class="gr gr-6 box" style="margin-top:16px">${cs.map(c=>coralCard(c,true)).join('')}</div>
  </div>`;
}
function renderCorales(){
  const vivos=S.corals.filter(c=>c.estado!=='perdido'), perdidos=S.corals.filter(c=>c.estado==='perdido');
  const list = coralFilter==='todos'?vivos : coralFilter==='perdidos'?perdidos : vivos.filter(c=>c.tipo===coralFilter);
  const edad = vivos.length ? Math.round(vivos.reduce((a,c)=>a+daysSince(c.fecha),0)/vivos.length) : 0;
  $('#v-corales').innerHTML=`
    <div class="sec">
      <div class="row"><div class="h-sec">Mis corales</div><div class="spacer"></div>
        <div class="meta">${vivos.length} vivos${perdidos.length?` · ${perdidos.length} ${plural(perdidos.length,'perdido','perdidos')}`:''}${vivos.length?` · antigüedad media ${edad} d`:''}</div></div>
      <div class="seg" style="margin-top:20px">
        <button class="${coralFilter==='todos'?'on':''}" data-cf="todos">Todos · ${vivos.length}</button>
        ${Object.entries(TIPOS).map(([k,n])=>{const q=vivos.filter(c=>c.tipo===k).length; return q?`<button class="${coralFilter===k?'on':''}" data-cf="${k}">${n} · ${q}</button>`:'';}).join('')}
        ${perdidos.length?`<button class="${coralFilter==='perdidos'?'on':''}" data-cf="perdidos">Perdidos · ${perdidos.length}</button>`:''}
      </div>
    </div>
    ${list.length ? `<div class="gr gr-4 box mx" style="margin:24px var(--pad) 40px">${list.map(c=>coralCard(c,false)).join('')}</div>`
      : `<div class="sec last"><div class="empty">Añade tu primer coral para llevar su progreso con fotos</div></div>`}`;
  hydratePhotos($('#v-corales'));
}
function coralForm(id){
  const c = id ? S.corals.find(x=>x.id===id) : null;
  const body=`<form id="fCoral">
    <div class="f2">
      <div class="field"><label>Nombre</label><input type="text" name="nombre" value="${esc(c?.nombre||'')}" placeholder="Acropora verde" required></div>
      <div class="field"><label>Especie</label><input type="text" name="especie" value="${esc(c?.especie||'')}" placeholder="Acropora millepora"></div>
      <div class="field"><label>Tipo</label><select name="tipo">${Object.entries(TIPOS).map(([k,n])=>`<option value="${k}" ${c?.tipo===k?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Estado</label><select name="estado">${Object.entries(ESTADOS).map(([k,n])=>`<option value="${k}" ${(c?.estado||'bien')===k?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Fecha de ingreso</label><input type="date" name="fecha" value="${c?.fecha||today()}"></div>
      <div class="field"><label>Ubicación</label><input type="text" name="ubic" value="${esc(c?.ubic||'')}" placeholder="Roca alta izquierda"></div>
    </div>
    <div class="field"><label>Foto inicial</label><input type="file" name="foto" accept="image/*"></div>
    <div class="field"><label>Notas</label><textarea name="nota">${esc(c?.nota||'')}</textarea></div>
  </form>`;
  openModal(c?'Editar coral':'Nuevo coral', body, async ()=>{
    const f=new FormData($('#fCoral')), file=f.get('foto');
    let photo=c?.photo||null;
    if(file&&file.size) photo=await Photos.put(await fileToDataURL(file));
    const data={nombre:f.get('nombre'),especie:f.get('especie'),tipo:f.get('tipo'),estado:f.get('estado'),
      fecha:f.get('fecha'),ubic:f.get('ubic'),nota:f.get('nota'),photo};
    if(c) Object.assign(c,data); else S.corals.push({id:uid(),log:[],...data});
    save(); closeModal(); renderAll(); toast('Coral guardado');
  }, 'wide');
}
function coralDetail(id){
  const c=S.corals.find(x=>x.id===id); if(!c) return;
  const log=[...(c.log||[])].sort((a,b)=>a.date<b.date?1:-1);
  const conFoto=[...(c.log||[])].filter(l=>l.photo).sort((a,b)=>a.date<b.date?-1:1);
  const first=c.photo?{photo:c.photo,date:c.fecha}:conFoto[0];
  const lastP=conFoto.length?conFoto[conFoto.length-1]:null;
  const cmp=first&&lastP&&first.photo!==lastP.photo;
  const tallas=(c.log||[]).filter(l=>l.talla).map(l=>({x:dOf(l.date).getTime(),y:+l.talla,date:l.date})).sort((a,b)=>a.x-b.x);
  const body=`
    <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
      <div style="flex:0 0 170px;max-width:100%"><div class="ph" style="width:170px">
        ${(lastP?.photo||c.photo)?`<img data-ph="${lastP?.photo||c.photo}" alt="">`:'<span>foto coral</span>'}</div></div>
      <div style="flex:1;min-width:200px">
        <div class="row" style="gap:10px"><span class="tipo">${(TIPOS[c.tipo]||'Otro').toUpperCase()}</span>
          <span class="tipo ${MALOS.includes(c.estado)?'bad':''}">${(ESTADOS[c.estado]||'Bien').toUpperCase()}</span></div>
        <div style="font-size:14px;color:var(--n700);margin-top:10px;line-height:1.9">
          ${c.especie?`<i>${esc(c.especie)}</i><br>`:''}Ingresó ${fmtDate(c.fecha)} · <b style="color:var(--ink)">${daysSince(c.fecha)} días</b><br>
          ${c.ubic?`${esc(c.ubic)}<br>`:''}${c.nota?`<span class="dim">${esc(c.nota)}</span>`:''}</div>
      </div>
    </div>
    ${cmp?`<div style="margin-top:28px"><div class="row"><div class="h-sub">Progreso</div><div class="spacer"></div>
      <div class="meta">${Math.round((dOf(lastP.date)-dOf(first.date))/864e5)} días entre fotos</div></div>
      <div class="cmp" style="margin-top:14px">
        <figure><img data-ph="${first.photo}" alt=""><figcaption>Inicio · ${fmtDate(first.date)}</figcaption></figure>
        <figure><img data-ph="${lastP.photo}" alt=""><figcaption>Actual · ${fmtDate(lastP.date)}</figcaption></figure></div></div>`:''}
    ${tallas.length>1?`<div style="margin-top:28px"><div class="h-sub">Talla · cm</div>
      <div style="border:2px solid var(--divider);padding:16px 16px 8px;margin-top:14px">${bigChart(tallas,'__talla',{noBand:true,eventos:false,nombre:'Talla',unidad:'cm',dec:1})}</div></div>`:''}
    <div style="margin-top:28px">
      <div class="row"><div class="h-sub">Bitácora · ${log.length}</div><div class="spacer"></div>
        <button class="btn btn-primary" data-logadd="${c.id}">+ REGISTRO</button></div>
      ${log.length?`<div style="border-top:2px solid var(--divider);margin-top:14px">${log.map(l=>`
        <div class="tl-item"><div class="row" style="gap:12px">
          <span class="tl-d">${fmtDate(l.date)} · ${agoTxt(l.date)}</span><span class="spacer"></span>
          ${l.estado?`<span class="tl-d ${MALOS.includes(l.estado)?'bad':''}">${ESTADOS[l.estado]}</span>`:''}
          ${l.talla?`<span class="tl-d dim">${l.talla} cm</span>`:''}</div>
          ${l.nota?`<div class="tl-t">${esc(l.nota)}</div>`:''}
          ${l.photo?`<img class="tl-img" data-ph="${l.photo}" alt="">`:''}
          <button class="lnk" data-logdel="${c.id}:${l.id}" style="margin-top:8px">Eliminar</button></div>`).join('')}</div>`
      :`<div class="empty" style="margin-top:14px">Sin registros todavía</div>`}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;border-top:2px solid var(--divider);padding-top:20px;margin-top:28px">
      <button class="btn" data-coraledit="${c.id}">EDITAR FICHA</button>
      <button class="btn btn-danger" data-coraldel="${c.id}">ELIMINAR</button></div>`;
  openModal(c.nombre, body, null, 'wide');
  hydratePhotos($('#modal'));
}
function logForm(coralId){
  const c=S.corals.find(x=>x.id===coralId);
  const body=`<form id="fLog">
    <div class="f2">
      <div class="field"><label>Fecha</label><input type="date" name="date" value="${today()}" required></div>
      <div class="field"><label>Estado</label><select name="estado">${Object.entries(ESTADOS).map(([k,n])=>`<option value="${k}" ${(c.estado||'bien')===k?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Talla mayor (cm)</label><input type="number" step="0.1" name="talla"></div>
    </div>
    <div class="field"><label>Foto</label><input type="file" name="foto" accept="image/*"></div>
    <div class="field"><label>Observaciones</label><textarea name="nota"></textarea></div>
  </form>`;
  openModal('Registro · '+c.nombre, body, async ()=>{
    const f=new FormData($('#fLog')), file=f.get('foto');
    const photo=(file&&file.size)?await Photos.put(await fileToDataURL(file)):null;
    c.log=c.log||[];
    c.log.push({id:uid(),date:f.get('date'),estado:f.get('estado'),talla:f.get('talla')||null,nota:f.get('nota'),photo});
    c.log.sort((a,b)=>a.date<b.date?-1:1);
    c.estado=f.get('estado');
    save(); closeModal(); renderAll(); toast('Registro añadido');
    setTimeout(()=>coralDetail(coralId),60);
  }, 'wide');
}

/* ───────────────────── MANTENIMIENTO (§7.6) ───────────────────── */
let mantFilter='todo';
function renderMant(){
  const all=[...S.maint].sort((a,b)=>a.date<b.date?1:-1);
  const g=GRUPOS[mantFilter];
  const list=g?all.filter(m=>g.includes(m.tipo)):all;
  const ren=renovacion(), ultimo=all.find(m=>m.tipo==='cambio');
  const objSem = S.settings.cambioSemanal, objPct = V()?objSem/V()*100:0;

  $('#v-mant').innerHTML=`
    <div class="sec"><div class="h-sec">Renovación de agua</div></div>
    <div class="gr gr-4 box mx" style="margin-top:20px">
      <div class="stat"><div class="v">${ultimo?daysSince(ultimo.date)+' d':'—'}</div><div class="l">Último cambio</div></div>
      <div class="stat"><div class="v">${ren.l7} L</div><div class="l">Cambiado 7 d</div></div>
      <div class="stat"><div class="v"${ren.semana!=null&&ren.semana<10?' style="color:var(--acc700)"':''}>${ren.semana!=null?fmt(ren.semana,1)+' %':'—'}</div><div class="l">Renovación semanal</div></div>
      <div class="stat"><div class="v"${ren.mes!=null&&ren.mes<5?' style="color:var(--acc700)"':''}>${ren.mes!=null?fmt(ren.mes,1)+' %':'—'}</div><div class="l">Renovación mensual</div></div>
    </div>
    <div class="mx note ${ren.mes!=null&&ren.mes<5?'acc':''}" style="margin-top:20px">
      <div class="kicker ${ren.mes!=null&&ren.mes<5?'acc':''}">Por qué importa con Balling</div>
      <div class="t">El Balling de dos partes repone calcio y alcalinidad, pero deja atrás <b>sodio y cloruro</b> que se acumulan poco a poco.
        Un recambio del <b>10 % semanal o más</b> compensa de sobra esa acumulación en un acuario de consumo normal.
        Por debajo de ~5 % mensual conviene considerar <b>Balling Light</b>, que usa sal sin NaCl justo para no meter ese exceso.
        ${objSem?`Tu objetivo de ${objSem} L semanales son ${fmt(objPct,1)} % de los ${V()} L netos.`:''}</div>
    </div>

    <div class="sec last" style="padding-top:32px">
      <div class="row"><div class="h-sec">Bitácora · ${all.length}</div><div class="spacer"></div>
        <div class="ulinks">${Object.keys(GRUPOS).map(k=>`<button class="${mantFilter===k?'on':''}" data-mf="${k}">${k==='todo'?'Todo':k[0].toUpperCase()+k.slice(1)}</button>`).join('')}</div>
        <button class="btn btn-primary" data-quick="mant" style="margin-left:12px">+ REGISTRAR</button></div>
      ${list.length?`<div class="tbl-box" style="margin-top:16px"><table style="min-width:640px">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Detalle</th><th></th></tr></thead>
        <tbody>${list.map(m=>`<tr>
          <td class="k">${fmtDate(m.date)}</td><td>${MANT[m.tipo]||'Otro'}</td>
          <td>${m.cant?`${m.cant} ${esc(m.unidad||'L')}${m.tipo==='cambio'?` <span class="dim">· ${fmt(m.cant/V()*100,1)} %</span>`:''}`:'—'}</td>
          <td style="white-space:normal;color:var(--n700)">${esc([m.marca,m.nota].filter(Boolean).join(' · '))}</td>
          <td><button class="lnk" data-del-mant="${m.id}">✕</button></td></tr>`).join('')}
        </tbody></table></div>`:`<div class="empty" style="margin-top:16px">Sin registros en este filtro</div>`}
    </div>`;
}
function mantForm(){
  const body=`<form id="fMant">
    <div class="f2">
      <div class="field"><label>Fecha</label><input type="date" name="date" value="${today()}" required></div>
      <div class="field"><label>Tipo</label><select name="tipo">${Object.entries(MANT).map(([k,n])=>`<option value="${k}" ${k==='cambio'?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Cantidad</label><input type="number" step="0.1" name="cant" value="${S.settings.cambioSemanal||''}"></div>
      <div class="field"><label>Unidad</label><select name="unidad"><option>L</option><option>ml</option><option>g</option><option>pza</option></select></div>
    </div>
    <div class="field"><label>Marca de sal</label><input type="text" name="marca" placeholder="Red Sea Coral Pro, Tropic Marin…"></div>
    <div class="field"><label>Detalle</label><textarea name="nota"></textarea></div>
    <div class="note tight" id="mantPrev"></div>
  </form>`;
  openModal('Registrar mantenimiento', body, ()=>{
    const f=new FormData($('#fMant'));
    S.maint.push({id:uid(),date:f.get('date'),tipo:f.get('tipo'),cant:f.get('cant')||null,
      unidad:f.get('unidad'),marca:f.get('marca'),nota:f.get('nota')});
    save(); closeModal(); renderAll(); toast('Registro guardado');
  });
  const upd=()=>{
    const f=$('#fMant'), c=+f.cant.value;
    $('#mantPrev').innerHTML = (f.tipo.value==='cambio'&&c>0)
      ? `<div class="t">${c} L son <b>${fmt(c/V()*100,1)} %</b> de tus ${V()} L netos.</div>` : '';
  };
  $('#fMant').addEventListener('input',upd); $('#fMant').addEventListener('change',upd); upd();
}

/* ───────────────────── CALCULADORAS ───────────────────── */
function renderCalc(){
  const V0=V();
  $('#v-calc').innerHTML=`
    <div class="gr gr-2 band">
      <div class="calc">
        <div class="calc-h"><span class="n">01</span><span class="h-sub">Corrección en seco</span></div>
        <div style="font-size:13px;color:var(--n700);margin-top:-12px;text-wrap:pretty">Sin solución madre: gramos de sal directos al sump, disueltos antes en osmosis.</div>
        <div class="f2" style="margin-top:20px">
          <div class="field"><label>Parámetro</label><select id="scK"><option value="ca">Calcio (ppm)</option><option value="mg">Magnesio (ppm)</option><option value="kh">Alcalinidad (dKH)</option></select></div>
          <div class="field"><label>Volumen neto (L)</label><input type="number" id="scV" value="${V0}"></div>
          <div class="field"><label>Valor actual</label><input type="number" step="0.01" id="scA"></div>
          <div class="field"><label>Objetivo</label><input type="number" step="0.01" id="scB" style="border-color:var(--accent)"></div>
        </div>
        <div id="scOut"></div>
      </div>

      <div class="calc">
        <div class="calc-h"><span class="n">02</span><span class="h-sub">Salinidad y agua salada</span></div>
        <div class="f2">
          <div class="field"><label>Salinidad (ppt)</label><input type="number" step="0.1" id="sPpt" value="35.0"></div>
          <div class="field"><label>Densidad (sg @ 25 °C)</label><input type="number" step="0.0001" id="sSg" value="1.0263"></div>
        </div>
        <div class="note"><div class="t">Objetivo de arrecife: <b>35 ppt = 1.0263 sg</b>. Calibra el refractómetro con <b>solución estándar de 35 ppt</b>, nunca con agua destilada: calibrar con destilada es la causa más común de salinidad crónicamente baja. Ajusta como máximo <b>0.5 ppt al día</b>.</div></div>
        <div style="border-top:2px solid var(--divider);margin-top:22px;padding-top:20px">
          <div style="font-size:15px;font-weight:800;text-transform:uppercase">Preparar agua salada</div>
          <div class="f2" style="margin-top:14px">
            <div class="field"><label>Litros a preparar</label><input type="number" id="mL" value="${S.settings.cambioSemanal||20}"></div>
            <div class="field"><label>Salinidad objetivo (ppt)</label><input type="number" step="0.1" id="mPpt" value="35.0"></div>
          </div>
          <div id="mOut"></div>
        </div>
      </div>

      <div class="calc">
        <div class="calc-h"><span class="n">03</span><span class="h-sub">Hornear bicarbonato</span></div>
        <div style="font-size:13px;color:var(--n700);margin-top:-12px;text-wrap:pretty">Convierte NaHCO₃ en Na₂CO₃ para subir alcalinidad <b>sin bajar el pH</b>. El carbonato empuja el pH hacia arriba; el bicarbonato lo deja igual o lo baja un poco.</div>
        <div class="f2" style="margin-top:20px">
          <div class="field"><label>Carbonato que necesito (g)</label><input type="number" step="1" id="hoG" value="400"></div>
          <div class="field"><label>Rendimiento</label><input type="text" value="63.08 %" disabled></div>
        </div>
        <div id="hoOut"></div>
      </div>

      <div class="calc">
        <div class="calc-h"><span class="n">04</span><span class="h-sub">Cambio de agua para diluir</span></div>
        <div class="f2">
          <div class="field"><label>Parámetro</label><select id="wK"><option value="no3">Nitratos</option><option value="po4">Fosfatos</option></select></div>
          <div class="field"><label>Volumen neto (L)</label><input type="number" id="wV" value="${V0}"></div>
          <div class="field"><label>Valor actual</label><input type="number" step="0.01" id="wA"></div>
          <div class="field"><label>Valor deseado</label><input type="number" step="0.01" id="wB" style="border-color:var(--accent)"></div>
        </div>
        <div id="wOut"></div>
      </div>
    </div>`;

  const g=id=>$('#'+id);
  function calcSeco(){
    const k=g('scK').value, vol=+g('scV').value, a=parseFloat(g('scA').value), b=parseFloat(g('scB').value);
    const out=g('scOut'), p=P[k];
    if(isNaN(a)||isNaN(b)||!vol) return out.innerHTML='<div class="out"><div class="sub" style="margin-top:0">Captura valor actual, objetivo y volumen.</div></div>';
    const d=b-a;
    if(d<=0) return out.innerHTML='<div class="out"><div class="big">Sin dosis</div><div class="sub">Ya estás en el objetivo o por encima. Para bajar, suspende la dosificación o haz un cambio de agua.</div></div>';
    const lim=LIM[k], dias=Math.max(1,Math.ceil(d/lim.rec));
    const vOrig=S.settings.volumenNeto; S.settings.volumenNeto=vol;
    let cuerpo='';
    if(k==='mg'){
      const r=repartoMg(d);
      cuerpo=`<div class="big">${fmt(r.gCl,1)} + ${fmt(r.gSo,1)} g</div>
        <div class="sub"><b>${fmt(r.gCl,1)} g</b> de ${r.formaCl.f} más <b>${fmt(r.gSo,1)} g</b> de ${r.formaSo.f}, en proporción ${fmt(r.ratio,1)} : 1 en masa, para subir <b>${fmt(d,0)} ppm</b> en ${vol} L.</div>
        <div class="note acc" style="margin-top:16px"><div class="kicker acc">Por qué dos sales</div>
          <div class="t">Usar solo cloruro de magnesio mete cloruro de más y desbalancea la proporción iónica del agua respecto al agua de mar. La mezcla con sulfato mantiene la proporción. Cualquier valor entre 4:1 y 6:1 da prácticamente lo mismo.</div></div>`;
    } else {
      const comp = k==='ca' ? 'cacl2' : 'nahco3';
      const sal=S.salts.find(x=>x.compuesto===comp), f=formaDe(sal);
      const gr = k==='kh' ? (d*DKH_MEQ*vol)/f.ap : (d*vol)/f.ap;
      cuerpo=`<div class="big">${fmt(gr,1)} g</div>
        <div class="sub">de ${f.f} para subir <b>${fmt(d,p.dec)} ${p.u}</b> en ${vol} L.${hidratoIncierto(sal)?' <b class="bad">Hidrato sin confirmar: va calculado como anhidro.</b>':''}</div>`;
    }
    S.settings.volumenNeto=vOrig;
    out.innerHTML=`<div class="out">${cuerpo}
      <div class="note ${dias>1?'acc':''}" style="margin-top:16px">
        <div class="kicker ${dias>1?'acc':''}">${dias>1?`Repártelo en ${dias} días`:'Cabe en un día'}</div>
        <div class="t">${dias>1
          ? `El tope seguro es <b>${lim.rec} ${lim.u} al día</b>${k==='kh'?' (1.0 dKH es el límite duro)':''}. Subir ${fmt(d,p.dec)} ${p.u} de golpe estresa a los corales más de lo que ayuda cerrar la brecha rápido. Divide en ${dias} tomas iguales y vuelve a medir el día ${dias+1}.`
          : `La brecha está por debajo del tope de ${lim.rec} ${lim.u} diarios.`} Disuelve siempre en agua de osmosis antes de añadir, en zona de alto flujo.</div>
      </div></div>`;
  }
  function calcMezcla(){
    const L=+g('mL').value, ppt=+g('mPpt').value, gr=L*ppt;
    g('mOut').innerHTML=`<div class="mid" style="margin-top:4px">${(gr/1000).toFixed(2)} kg</div>
      <div class="sub">de sal aprox. para ${L} L a ${fmt(ppt,1)} ppt (~${Math.round(gr)} g)</div>
      <div class="sub" style="font-size:13px;margin-top:10px">Cada marca rinde distinto: añade el 90 %, mezcla con bomba 12–24 h y ajusta al final con el refractómetro calibrado.</div>`;
  }
  function calcHorno(){
    const need=+g('hoG').value||0, bic=need/0.6308;
    g('hoOut').innerHTML=`<div class="out"><div class="big">${fmt(bic,0)} g</div>
      <div class="sub">de bicarbonato (NaHCO₃) para obtener <b>${fmt(need,0)} g</b> de carbonato de sodio (Na₂CO₃).</div>
      <div class="note acc" style="margin-top:16px"><div class="kicker acc">Cómo</div>
        <div class="t">Extiende el bicarbonato en una charola y hornéalo a <b>180–200 °C durante una hora</b>. Pierde agua y CO₂, de ahí que rinda solo el 63 %.
          Déjalo enfriar tapado porque recaptura humedad del aire, y pésalo <b>después</b> de hornear: el peso que manda en la receta es el del producto final.
          Si tu pH ya anda alto, quédate con el bicarbonato sin hornear.</div></div></div>`;
  }
  function calcAgua(){
    const k=g('wK').value, vol=+g('wV').value, a=parseFloat(g('wA').value), b=parseFloat(g('wB').value), p=P[k];
    const out=g('wOut');
    if(isNaN(a)||isNaN(b)||!vol) return out.innerHTML='<div class="out"><div class="sub" style="margin-top:0">Captura los valores para calcular.</div></div>';
    if(b>=a) return out.innerHTML='<div class="out"><div class="sub" style="margin-top:0">El objetivo debe ser menor: el cambio de agua solo diluye.</div></div>';
    const frac=1-b/a, litros=frac*vol, sem=vol*0.15, n=Math.ceil(litros/sem);
    out.innerHTML=`<div class="out">
      <div style="display:flex;align-items:baseline;gap:10px"><div class="big">${Math.round(litros)} L</div>
        <div class="num" style="font-size:18px;font-weight:800;color:var(--n600)">${Math.round(frac*100)} %</div></div>
      <div class="sub">para pasar de ${fmt(a,p.dec)} a ${fmt(b,p.dec)} ${p.u} en un solo cambio</div>
      ${frac>0.3?`<div class="note acc" style="margin-top:16px"><div class="kicker acc">Demasiado de golpe</div>
        <div class="t">Un cambio mayor al 30 % estresa a los corales. Mejor <b>${n} ${plural(n,'cambio semanal','cambios semanales')} del 15 %</b> (${Math.round(sem)} L cada uno) con temperatura y salinidad igualadas.</div></div>`
      :`<div class="note" style="margin-top:16px"><div class="t">Iguala temperatura y salinidad del agua nueva antes de añadirla.</div></div>`}</div>`;
  }
  ['scK','scV','scA','scB'].forEach(i=>{g(i).addEventListener('input',calcSeco);g(i).addEventListener('change',calcSeco);});
  g('scK').addEventListener('change',()=>{const r=ultimoNorm(g('scK').value); if(r)g('scA').value=fmt(r.norm,2); const k=g('scK').value; g('scB').value=S.settings.objetivos[k]??''; calcSeco();});
  ['mL','mPpt'].forEach(i=>g(i).addEventListener('input',calcMezcla));
  g('hoG').addEventListener('input',calcHorno);
  ['wV','wA','wB'].forEach(i=>g(i).addEventListener('input',calcAgua));
  g('wK').addEventListener('change',()=>{const r=ultimoNorm(g('wK').value); if(r)g('wA').value=fmt(r.norm,3); calcAgua();});
  g('sPpt').addEventListener('input',()=>g('sSg').value=pptASg(+g('sPpt').value).toFixed(4));
  g('sSg').addEventListener('input',()=>g('sPpt').value=sgAPpt(+g('sSg').value).toFixed(1));
  const rc=ultimoNorm('ca'); if(rc) g('scA').value=fmt(rc.norm,0);
  g('scB').value=S.settings.objetivos.ca;
  const rn=ultimoNorm('no3'); if(rn) g('wA').value=fmt(rn.norm,2);
  calcSeco(); calcMezcla(); calcHorno(); calcAgua();
}

/* ───────────────────── AJUSTES ───────────────────── */
function renderAjustes(){
  const bytes=new Blob([JSON.stringify(S)]).size
    + Object.keys(localStorage).filter(k=>k.startsWith('reeflab-ph-')).reduce((a,k)=>a+localStorage.getItem(k).length,0);
  const pct=Math.min(100,Math.round(bytes/5e6*100));
  const vb=+S.settings.volumenBruto||0, vn=+S.settings.volumenNeto||0;
  const ratio = vb? vn/vb*100 : 0;
  const tests=autotests(), fallan=tests.filter(t=>!t.ok).length;

  $('#v-ajustes').innerHTML=`
    <div class="gr gr-2 band">
      <div class="calc">
        <div class="h-sub">Acuario</div>
        <div class="field" style="margin-top:20px"><label>Nombre</label><input type="text" id="aNombre" value="${esc(S.settings.nombre)}"></div>
        <div class="f2">
          <div class="field"><label>Volumen bruto (L)</label><input type="number" id="aBruto" value="${vb}"></div>
          <div class="field"><label>Volumen neto (L)</label><input type="number" id="aNeto" value="${vn}" style="border-color:var(--accent)"></div>
        </div>
        <div class="note ${ratio>90?'acc':''}">
          <div class="kicker ${ratio>90?'acc':''}">Todos los cálculos usan el volumen neto</div>
          <div class="t">El neto siempre es menor al nominal porque la roca viva, la arena y el equipo desplazan agua.
            Como regla ronda el <b>75–85 % del bruto</b>: un acuario de 175 L nominales suele tener 135–150 L reales.
            Si usas el bruto, <b>todas las dosis salen sobreestimadas en ~20 %</b>.
            ${vb&&vn?`<br><br>Vas en <b>${fmt(ratio,0)} %</b>${ratio>90?' — eso parece el volumen nominal, no el real.':ratio<70?' — parece bajo, revísalo.':' — dentro de lo esperado.'}`:''}</div>
        </div>
        <div class="f2" style="margin-top:18px">
          <div class="field"><label>Cambio semanal (L)</label><input type="number" id="aCambio" value="${S.settings.cambioSemanal}"></div>
          <div class="field"><label>Avisar si no mido en</label><input type="number" id="aDias" value="${S.settings.alertaDias}"></div>
        </div>
      </div>

      <div class="calc">
        <div class="h-sub">Objetivos y dosificación</div>
        <div class="f4" style="margin-top:20px">
          <div class="field"><label>KH (dKH)</label><input type="number" step="0.1" id="oKh" value="${S.settings.objetivos.kh}"></div>
          <div class="field"><label>Ca (ppm)</label><input type="number" step="5" id="oCa" value="${S.settings.objetivos.ca}"></div>
          <div class="field"><label>Mg (ppm)</label><input type="number" step="10" id="oMg" value="${S.settings.objetivos.mg}"></div>
          <div class="field"><label>Sal (ppt)</label><input type="number" step="0.1" id="oSal" value="${S.settings.objetivos.sal}"></div>
        </div>
        <div class="f3">
          <div class="field"><label>Hora Parte A</label><input type="time" id="hA" value="${S.settings.horaA}"></div>
          <div class="field"><label>Hora Parte B</label><input type="time" id="hB" value="${S.settings.horaB}"></div>
          <div class="field"><label>Hora magnesio</label><input type="time" id="hMg" value="${S.settings.horaMg}"></div>
        </div>
        <div class="field"><label>Proporción MgCl₂ : MgSO₄ (masa)</label>
          <input type="number" step="0.1" min="4" max="6" id="aRatio" value="${S.settings.mgRatio}"></div>
        <div class="note" id="sepNota"></div>
      </div>
    </div>

    <div class="sec">
      <div class="row"><div class="h-sub">Rangos objetivo</div><div class="spacer"></div>
        <button class="lnk" id="resetT">RESTAURAR VALORES POR DEFECTO</button></div>
      <div class="tbl-box" style="margin-top:16px"><table style="min-width:620px">
        <thead><tr><th>Parámetro</th><th>Unidad</th><th>Mínimo</th><th>Máximo</th><th>Último (norm.)</th></tr></thead>
        <tbody>${PARAMS.map(p=>{const t=tgt(p.k), r=ultimoNorm(p.k), off=r&&isOff(status(p.k,r.norm));
          return `<tr><td class="k">${p.n}</td><td class="dim">${p.u||'—'}</td>
            <td><input type="number" step="${p.step}" data-t="${p.k}.min" value="${t.min}" class="mini"></td>
            <td><input type="number" step="${p.step}" data-t="${p.k}.max" value="${t.max}" class="mini"></td>
            <td class="${off?'oo':''}">${r?fmt(r.norm,p.dec):'—'}</td></tr>`;}).join('')}
      </tbody></table></div>
      <div class="note" style="margin-top:16px"><div class="t">En alcalinidad la <b>estabilidad importa más que el número exacto</b>: un KH constante de 7.5 vale más que uno que oscila entre 7 y 10.</div></div>
    </div>

    <div class="sec">
      <div class="row"><div class="h-sub">Autoverificación</div><div class="spacer"></div>
        <div class="meta ${fallan?'bad':''}">${fallan?`${fallan} de ${tests.length} fallan`:`los ${tests.length} casos pasan`}</div></div>
      <div class="tbl-box" style="margin-top:16px"><table style="min-width:680px">
        <thead><tr><th></th><th>Caso</th><th>Esperado</th><th>Obtenido</th><th></th></tr></thead>
        <tbody>${tests.map(c=>`<tr>
          <td class="k">${c.n}</td><td>${esc(c.e)}${c.nota?`<div class="tiny dim">${esc(c.nota)}</div>`:''}</td>
          <td class="num">${c.esp} ${c.u}</td><td class="num">${fmt(c.obt, c.esp<10?4:c.esp<100?2:1)}</td>
          <td class="${c.ok?'':'oo'}" style="font-weight:800">${c.ok?'PASA':'FALLA'}</td></tr>`).join('')}
        </tbody></table></div>
      <div class="note" style="margin-top:16px"><div class="t">Los ocho casos de referencia se recalculan cada vez que abres esta pantalla, con V neto = 175 L y las constantes del catálogo.</div></div>
    </div>

    <div class="sec last">
      <div class="h-sub">Datos</div>
      <div style="font-size:13px;color:var(--n700);margin-top:10px">Todo se guarda en este dispositivo. Exporta un respaldo antes de cambiar de navegador.</div>
      <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">
        <button class="btn" data-export>EXPORTAR JSON</button>
        <button class="btn" id="impBtn">IMPORTAR</button>
        <button class="btn btn-danger" id="wipeBtn">BORRAR TODO</button>
        <input type="file" id="impFile" accept="application/json" style="display:none">
      </div>
      <div style="margin-top:24px;max-width:520px">
        <div class="row kicker"><span>Almacenamiento</span><span class="spacer"></span>
          <span class="num">${(bytes/1e6).toFixed(2)} MB de 5 MB · ${pct} %</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div style="font-size:12.5px;color:var(--n600);margin-top:8px">${S.tests.length} mediciones · ${S.solutions.length} soluciones · ${S.doses.length} dosis · ${S.maint.length} mantenimientos · ${S.corals.length} corales</div>
      </div>
    </div>`;

  const bind=(id,fn)=>{const e=$('#'+id); if(e) e.oninput=()=>{fn(e.value); save(); renderPanel(); renderPlan();};};
  bind('aNombre',v=>S.settings.nombre=v);
  bind('aBruto',v=>S.settings.volumenBruto=+v||0);
  bind('aNeto', v=>{S.settings.volumenNeto=+v||0; renderSoluciones();});
  bind('aCambio',v=>S.settings.cambioSemanal=+v||0);
  bind('aDias', v=>S.settings.alertaDias=+v||7);
  bind('oKh',  v=>S.settings.objetivos.kh=+v||0);
  bind('oCa',  v=>S.settings.objetivos.ca=+v||0);
  bind('oMg',  v=>S.settings.objetivos.mg=+v||0);
  bind('oSal', v=>S.settings.objetivos.sal=+v||0);
  bind('aRatio',v=>S.settings.mgRatio=Math.min(6,Math.max(4,+v||4.4)));
  const sep=()=>{
    const h=separacionHoras($('#hA').value,$('#hB').value);
    $('#sepNota').innerHTML=`<div class="kicker ${h<1?'acc':''}">Separación entre partes</div>
      <div class="t">Las partes A y B están a <b>${fmt(h,1)} h</b>.
        ${h<1?'<b class="bad">Muy poco.</b> Nunca dosifiques alcalinidad y calcio al mismo tiempo ni en el mismo punto: precipitan al instante y pierdes las dos. Deja mínimo 1 h, idealmente 2–4.'
             :'Suficiente. Lo ideal son 2–4 h; si no puedes separarlas más, échalas en puntos opuestos del sump.'}</div>`;
  };
  ['hA','hB','hMg'].forEach(id=>{const e=$('#'+id); e.oninput=()=>{
    S.settings[id==='hA'?'horaA':id==='hB'?'horaB':'horaMg']=e.value; save(); sep(); renderPlan();};});
  sep();
  $$('#v-ajustes input[data-t]').forEach(i=>i.oninput=()=>{
    const [k,f]=i.dataset.t.split('.');
    S.settings.targets[k]=S.settings.targets[k]||{};
    S.settings.targets[k][f]= i.value===''?null:+i.value;
    save(); renderPanel();
  });
  $('#resetT').onclick=()=>{S.settings.targets={}; save(); renderAll(); toast('Rangos restaurados');};
  $('#impBtn').onclick=()=>$('#impFile').click();
  $('#impFile').onchange=importData;
  $('#wipeBtn').onclick=()=>{
    if(!confirm('¿Borrar TODOS los datos? Esto no se puede deshacer.')) return;
    localStorage.removeItem('reeflab');
    Object.keys(localStorage).filter(k=>k.startsWith('reeflab-ph-')).forEach(k=>localStorage.removeItem(k));
    try{ indexedDB.deleteDatabase('reeflab-photos'); }catch(e){}
    S=semilla(); save(); renderAll(); toast('Datos borrados');
  };
}
