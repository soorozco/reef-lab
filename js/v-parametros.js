/* ═══════════════════════════════════════════════════════════════════════
   v-parametros.js — registro de mediciones (§7.1) e historial/gráficas (§7.5).
   ═══════════════════════════════════════════════════════════════════════ */

let chartK = 'kh', chartD = 180, chartModo = 'uno';

function renderParametros(){
  const ts = sortedTests();
  const rango = ts.length ? `${ts.length} ${plural(ts.length,'medición','mediciones')} · ${fmtDate(ts[ts.length-1].date)} — ${fmtDate(ts[0].date)}` : 'Sin mediciones';
  const p = P[chartK], {min:tmin,max:tmax} = tgt(chartK);
  const pts = serieNorm(chartK, chartD||null);

  $('#v-parametros').innerHTML = `
    <div class="sec">
      <div class="row"><div class="h-sec">Evolución</div><div class="spacer"></div><div class="meta">${rango}</div></div>
      <div class="seg" style="margin-top:20px">
        <button class="${chartModo==='acople'?'on':''}" data-cmodo="acople">KH + Ca</button>
        ${PARAMS.map(x=>`<button class="${chartModo==='uno'&&x.k===chartK?'on':''}" data-ck="${x.k}">${x.n}</button>`).join('')}
      </div>
      <div class="row c" style="margin-top:16px">
        <div class="ulinks">
          ${[[30,'30 días'],[90,'3 meses'],[180,'6 meses'],[365,'1 año'],[0,'Todo']].map(([d,l])=>
            `<button class="${d===chartD?'on':''}" data-cd="${d}">${l}</button>`).join('')}
        </div>
        <div class="spacer"></div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap" class="kicker">
          ${chartModo==='acople'
            ? `<span style="display:flex;align-items:center;gap:6px"><span style="width:22px;height:0;border-top:3px solid var(--ink);display:block"></span>Alcalinidad</span>
               <span style="display:flex;align-items:center;gap:6px"><span style="width:22px;height:0;border-top:3px dashed var(--accent);display:block"></span>Calcio</span>`
            : `<span style="display:flex;align-items:center;gap:8px"><span style="width:22px;height:10px;display:block;background:rgba(32,30,29,.10)"></span>Rango objetivo ${fmt(tmin,p.dec)} – ${fmt(tmax,p.dec)} ${p.u}</span>`}
          <span style="display:flex;align-items:center;gap:6px"><span style="width:22px;height:0;border-top:2px dashed var(--n600);display:block"></span>Cambio de agua</span>
        </div>
      </div>
    </div>

    <div class="mx" style="margin-top:20px;border:2px solid var(--divider);padding:20px 20px 12px">
      ${chartModo==='acople' ? overlayKhCa(chartD||null) : bigChart(pts, chartK)}
    </div>
    ${chartModo==='acople' ? bloqueAcople() : statsBox(pts, chartK)}

    <div class="sec last">
      <div class="row"><div class="h-sec">Historial · ${S.tests.length}</div><div class="spacer"></div>
        <button class="btn btn-primary" data-quick="test">+ MEDICIÓN</button></div>
      ${S.tests.length ? `<div class="tbl-box" style="margin-top:16px"><table style="min-width:880px">
        <thead><tr><th>Fecha</th>${PARAMS.map(x=>`<th>${x.ab}${x.u?' '+x.u:''}</th>`).join('')}<th>Notas</th><th></th></tr></thead>
        <tbody>${ts.map(t=>`<tr>
          <td class="k">${fmtDate(t.date)}</td>
          ${PARAMS.map(x=>{
            const r=leer(t,x.k);
            if(!r) return '<td class="dim">—</td>';
            const off=isOff(status(x.k,r.norm));
            return `<td class="${off?'oo':''}" ${r.normalizado?`title="medido ${fmt(r.crudo,x.dec)} a ${fmt(r.sal,1)} ppt"`:''}>${fmt(r.norm,x.dec)}${r.normalizado?'<sup class="norm">n</sup>':''}</td>`;
          }).join('')}
          <td style="min-width:170px;white-space:normal;color:var(--n700);font-size:13px">${esc(t.note||'')}</td>
          <td style="white-space:nowrap"><button class="lnk" data-edit-test="${t.id}">Ed.</button>
            <button class="lnk" data-del-test="${t.id}" style="margin-left:8px">✕</button></td>
        </tr>`).join('')}</tbody></table></div>
        <div class="meta" style="margin-top:12px;color:var(--n600)">
          Los valores se muestran normalizados a 35 ppt; <sup class="norm">n</sup> marca los que se corrigieron por salinidad (pasa el cursor para ver el valor medido). Rojo = fuera de rango.
        </div>`
      : `<div class="empty" style="margin-top:16px">Sin mediciones. La primera desbloquea el plan de dosificación.</div>`}
    </div>`;
}

function bloqueAcople(){
  const des = desacoplamiento();
  const A=serieNorm('kh',chartD||null), B=serieNorm('ca',chartD||null);
  /* Brecha = cuánto se movió el calcio de más (o de menos) frente a lo que
     predice la alcalinidad por el acoplamiento 7.15:1, en el periodo mostrado. */
  let veredicto;
  if(A.length<2 || B.length<2){
    veredicto = 'Hacen falta al menos dos mediciones con ambos parámetros para juzgarlo.';
  } else {
    const dKh = A[A.length-1].y - A[0].y;
    const dCa = B[B.length-1].y - B[0].y;
    const brecha = dCa - dKh*ACOPLE;
    const abs = Math.abs(brecha);
    if(abs < 10)
      veredicto = `En este periodo van acopladas: el calcio se movió ${fmt(dCa,0)} ppm y la alcalinidad predecía ${fmt(dKh*ACOPLE,0)} ppm. La diferencia (${fmt(abs,0)} ppm) cabe dentro del error de un kit doméstico.`;
    else
      veredicto = `<b>Se están separando ${fmt(abs,0)} ppm:</b> el calcio se movió ${fmt(dCa,0)} ppm cuando la alcalinidad predecía ${fmt(dKh*ACOPLE,0)} ppm.`
        + (brecha<0
            ? ` El calcio va por detrás — es la firma de dosificar la Parte A sin la Parte B. Revisa que el bidón de calcio esté saliendo.`
            : ` El calcio va por delante — estás metiendo más Parte B que Parte A, o el kit de calcio se está yendo alto.`);
  }
  return `<div class="mx note ${des||veredicto.startsWith('<b>')?'acc':''}" style="margin-top:20px">
    <div class="kicker ${des||veredicto.startsWith('<b>')?'acc':''}">Acoplamiento calcificación</div>
    <div class="t">Los dos ejes están escalados a la relación <b>1 dKH ↔ ${ACOPLE} ppm de calcio</b> y anclados en tus objetivos
      (${fmt(S.settings.objetivos.kh,1)} dKH / ${S.settings.objetivos.ca} ppm), sobre valores normalizados a 35 ppt.
      Si los corales consumen las dos partes a la par, las líneas se mueven juntas.<br><br>${veredicto}</div>
  </div>`;
}

function statsBox(pts,k){
  if(pts.length<2) return '<div style="height:20px"></div>';
  const p=P[k], ys=pts.map(q=>q.y);
  const avg=ys.reduce((a,b)=>a+b,0)/ys.length;
  const mn=Math.min(...ys), mx=Math.max(...ys);
  const pct=Math.round(pts.filter(q=>status(k,q.y)==='ok').length/pts.length*100);
  const first=pts[0], last=pts[pts.length-1];
  const dias=(last.x-first.x)/864e5;
  const sem = dias>0 ? (last.y-first.y)/dias*7 : 0;
  const cons = k==='kh' ? consumo() : null;
  return `
    <div class="gr gr-4 box mx" style="margin-top:20px">
      <div class="stat sm"><div class="v">${fmt(avg,p.dec)}</div><div class="l">Promedio</div></div>
      <div class="stat sm"><div class="v">${fmt(mn,p.dec)} – ${fmt(mx,p.dec)}</div><div class="l">Mín – Máx</div></div>
      <div class="stat sm"><div class="v">${pct} %</div><div class="l">En rango</div></div>
      <div class="stat sm"><div class="v"${sem<0?' style="color:var(--acc700)"':''}>${sem>=0?'+':'−'}${fmt(Math.abs(sem),p.dec)}</div><div class="l">Cambio / semana</div></div>
    </div>
    ${cons&&cons.dkh>0?`<div class="mx note acc" style="margin-top:20px">
      <div class="kicker acc">Consumo medido</div>
      <div class="t">${fmt(cons.dkh,2)} dKH al día entre las dos últimas mediciones (${Math.round(cons.dias)} ${plural(Math.round(cons.dias),'día','días')}),
        equivalente a ${fmt(cons.ca,1)} ppm de calcio. Ya está aplicado en el <b>Plan</b>.</div>
    </div>`:''}
    ${p.err?`<div class="mx note" style="margin-top:20px"><div class="kicker">Margen del kit</div>
      <div class="t">${esc(p.err)}.</div></div>`:''}`;
}

/* ═══════════════ kits ═══════════════
   Desplegable en vez de texto libre: escribir el nombre a mano es una
   fuente de erratas y de que el mismo kit acabe con tres grafías. La lista
   arranca con los de casa y va sumando los que el usuario añada con «Otro». */
const KITS_BASE = ['Salifert','Hanna'];
function kitsConocidos(k){
  const vistos = new Set(KITS_BASE);
  for(const t of S.tests){ const v=t.kits?.[k]; if(v) vistos.add(v); }
  return [...vistos].sort((a,b)=>a.localeCompare(b,'es'));
}
/* al capturar, propone el kit de la última medición que lo registró */
function kitPorDefecto(k, t){
  if(t) return t.kits?.[k] || '';
  for(const x of sortedTests()){ const v=x.kits?.[k]; if(v) return v; }
  return '';
}
function campoKit(k, t){
  const actual = kitPorDefecto(k, t);
  const lista  = kitsConocidos(k);
  return `<div class="field">
    <label>${P[k].n}</label>
    <select name="kit_${k}" data-kit="${k}">
      <option value="">— sin especificar —</option>
      ${lista.map(n=>`<option value="${esc(n)}" ${actual===n?'selected':''}>${esc(n)}</option>`).join('')}
      <option value="__otro">Otro…</option>
    </select>
    <input type="text" name="kitotro_${k}" class="kit-otro" placeholder="Nombre del kit"
           style="margin-top:6px;display:none">
    <div class="tiny dim" style="margin-top:4px">${esc(P[k].err||'')}</div>
  </div>`;
}

/* ═══════════════ formulario de medición (§7.1) ═══════════════ */
function testForm(id){
  const t = id ? S.tests.find(x=>x.id===id) : null;
  const unidad = S.settings.salUnidad||'ppt';
  const body = `<form id="fTest">
    <div class="f2">
      <div class="field"><label>Fecha</label><input type="date" name="date" value="${t?t.date:today()}" required></div>
      <div class="field"><label>Salinidad</label>
        <div style="display:flex;gap:8px">
          <input type="number" step="${unidad==='ppt'?'0.1':'0.0001'}" name="sal" value="${t&&t.v.sal!=null?(unidad==='ppt'?t.v.sal:pptASg(t.v.sal).toFixed(4)):''}" placeholder="${unidad==='ppt'?'35.0':'1.0263'}">
          <select name="salU" style="max-width:88px"><option value="ppt" ${unidad==='ppt'?'selected':''}>ppt</option><option value="sg" ${unidad==='sg'?'selected':''}>sg</option></select>
        </div></div>
    </div>
    <div class="f3">
      ${PARAMS.filter(p=>p.k!=='sal').map(p=>{
        const lv=lastVal(p.k);
        return `<div class="field"><label>${p.n}${p.u?` (${p.u})`:''}</label>
          <input type="number" step="${p.step}" name="${p.k}" value="${t&&t.v[p.k]!=null?t.v[p.k]:''}" placeholder="${lv?fmt(lv.v,p.dec):'—'}"></div>`;
      }).join('')}
    </div>
    <div class="meta" id="salHint" style="margin:-6px 0 16px;color:var(--n700)"></div>

    <details class="det-kits" ${t?'open':''}><summary>Kits usados y margen de error</summary>
      <div class="tiny dim" style="margin:10px 0 4px">Vienen preseleccionados los de tu última medición; cámbialos solo si mediste con otro.</div>
      <div class="f3" style="margin-top:10px">
        ${['kh','ca','mg','no3','po4'].map(k=>campoKit(k,t)).join('')}
      </div>
    </details>

    <div class="field" style="margin-top:16px"><label>Notas</label>
      <textarea name="note" placeholder="Cambio de agua ese día, coral nuevo, algo raro…">${esc(t?.note||'')}</textarea></div>
    <div class="note tight"><div class="t dim">Todos los campos salvo la fecha son opcionales: puedes guardar solo el KH si es lo único que mediste.</div></div>
  </form>`;

  openModal(t?'Editar medición':'Registrar medición', body, ()=>{
    const f=new FormData($('#fTest'));
    const v={}, kits={};
    for(const p of PARAMS){
      if(p.k==='sal') continue;
      const x=f.get(p.k); if(x!=='' && x!=null) v[p.k]=+x;
    }
    const sraw=f.get('sal');
    if(sraw!=='' && sraw!=null){
      const val=+sraw;
      v.sal = f.get('salU')==='sg' ? +sgAPpt(val).toFixed(2) : val;
      S.settings.salUnidad = f.get('salU');
    }
    for(const k of ['kh','ca','mg','no3','po4']){
      let x = f.get('kit_'+k);
      if(x==='__otro') x = (f.get('kitotro_'+k)||'').trim();
      if(x) kits[k]=x;
    }
    if(!Object.keys(v).length) return toast('Captura al menos un parámetro');
    if(t) Object.assign(t,{date:f.get('date'), note:f.get('note'), v, kits});
    else S.tests.push({id:uid(), date:f.get('date'), note:f.get('note'), v, kits});
    save(); closeModal(); renderAll(); toast('Medición guardada');
  }, 'wide');

  const upd=()=>{
    const f=$('#fTest'), u=f.salU.value, val=+f.sal.value;
    const hint=$('#salHint');
    if(!val) return hint.innerHTML='';
    const ppt = u==='sg' ? sgAPpt(val) : val;
    const sg  = u==='sg' ? val : pptASg(val);
    let txt = `${fmt(ppt,1)} ppt = ${sg.toFixed(4)} sg a 25 °C.`;
    if(ppt<34||ppt>36) txt += ` <b style="color:var(--acc700)">Fuera de 34–36 ppt: tus iones van a leer proporcionalmente ${ppt<35?'bajos':'altos'}. Corrige la salinidad antes de dosificar, máximo 0.5 ppt por día.</b>`;
    else if(Math.abs(ppt-35)>0.05) txt += ` Las lecturas iónicas se normalizarán × ${(35/ppt).toFixed(3)}.`;
    hint.innerHTML=txt;
  };
  $('#fTest').addEventListener('input',upd);
  $('#fTest').addEventListener('change',upd);
  upd();

  /* «Otro…» abre el campo de texto y le da el foco */
  for(const sel of $$('#fTest select[data-kit]')){
    sel.addEventListener('change', ()=>{
      const otro = sel.parentElement.querySelector('.kit-otro');
      const abierto = sel.value==='__otro';
      otro.style.display = abierto ? '' : 'none';
      if(abierto) otro.focus(); else otro.value='';
    });
  }
}
