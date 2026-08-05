/* ═══════════════════════════════════════════════════════════════════════
   v-plan.js — Panel (resumen + avisos) y Plan de dosificación (§7.3).
   ═══════════════════════════════════════════════════════════════════════ */

function renderPanel(){
  const t = ultimaMedicion();
  const av = avisos();
  const cons = consumo();
  const ren = renovacion();
  const vivos = S.corals.filter(c=>c.estado!=='perdido');
  const pl = plan();

  const claves = ['kh','ca','mg','no3','po4'];
  const cells = PARAMS.map(p=>{
    const r = ultimoNorm(p.k);
    const st = status(p.k, r?.norm), off = isOff(st);
    const {min,max} = tgt(p.k);
    const prev = (()=>{ let n=0; for(const x of sortedTests()){ const v=leer(x,p.k); if(v){ n++; if(n===2) return v.norm; } } return null; })();
    let dlt='—';
    if(r && prev!=null){ const d=r.norm-prev; dlt=`${d>0?'▲':d<0?'▼':'●'} ${fmt(Math.abs(d),p.dec)} · ${agoTxt(r.date)}`; }
    else if(r) dlt=agoTxt(r.date);
    return `<div class="pcell">
      <div class="top"><span class="sq ${off?'bad':''}"></span><span class="nm ${off?'bad':''}">${p.n}</span></div>
      <div class="val"><b ${off?'class="bad"':''}>${r?fmt(r.norm,p.dec):'—'}</b>${p.u?`<span>${p.u}</span>`:''}</div>
      <div class="dlt ${off?'bad':''}">${dlt}</div>
      ${r?.normalizado?`<div class="obj" style="color:var(--acc700)">medido ${fmt(r.crudo,p.dec)} @ ${fmt(r.sal,1)} ppt</div>`:''}
      ${sparkline(serieNorm(p.k,180), p.k)}
      <div class="obj">OBJ. ${fmt(min,p.dec)}–${fmt(max,p.dec)}</div>
    </div>`;
  }).join('');

  $('#v-panel').innerHTML = `
    <div class="gr hero band" style="grid-template-columns:1.4fr 1fr">
      <div style="padding:32px var(--pad)">
        <div class="kicker acc">Acuario 01</div>
        <div class="tank">${esc(S.settings.nombre)}</div>
        <div class="meta" style="margin-top:12px;font-weight:400;color:var(--n700)">
          ${S.settings.volumenNeto} L netos de ${S.settings.volumenBruto} L brutos${vivos.length?` · ${vivos.length} ${plural(vivos.length,'coral','corales')}`:''}
        </div>
        <div style="display:flex;gap:8px;margin-top:24px;flex-wrap:wrap">
          <button class="btn btn-primary" data-quick="test">+ MEDICIÓN</button>
          <button class="btn" data-tabgo="plan">VER PLAN</button>
          <button class="btn" data-quick="mant">+ MANTENIMIENTO</button>
        </div>
      </div>
      <div class="gr gr-2 gr-stats">
        <div class="stat"><div class="v">${cons&&cons.dkh>0?fmt(cons.dkh,2):'—'}</div><div class="l">Consumo dKH/día</div></div>
        <div class="stat"><div class="v">${t?daysSince(t.date)+' d':'—'}</div><div class="l">Última medición</div></div>
        <div class="stat"><div class="v">${pl&&pl.mant.A?Math.round(pl.mant.A.ml)+' ml':'—'}</div><div class="l">Parte A diaria</div></div>
        <div class="stat"><div class="v">${ren.semana!=null?fmt(ren.semana,0)+' %':'—'}</div><div class="l">Renovado 7 d</div></div>
      </div>
    </div>

    <div class="sec band" style="padding-bottom:28px">
      <div class="kicker" style="margin-bottom:16px">Avisos · ${av.length}</div>
      <div class="avisos">${(()=>{
        const vis=av.slice(0,8), relleno=(4-vis.length%4)%4;
        return vis.map(a=>`<div class="aviso ${a.sev==='bad'?'bad':''} ${a.sev==='ok'?'ok':''}">
          <div class="t">${esc(a.t)}</div><div class="d">${esc(a.d)}</div></div>`).join('')
          + '<div class="aviso fill"></div>'.repeat(relleno);
      })()}</div>
    </div>

    <div class="sec">
      <div class="row"><div class="h-sec">Parámetros actuales</div><div class="spacer"></div>
        <div class="meta">normalizados a 35 ppt · tendencia 180 días</div></div>
    </div>
    <div class="gr gr-4 box mx" style="margin-top:16px;margin-bottom:32px">${cells}</div>
    ${renderCoralStrip()}`;
  hydratePhotos($('#v-panel'));
}

/* ═══════════════════════ PLAN (§7.3) ═══════════════════════ */
function renderPlan(){
  const pl = plan();
  const el = $('#v-plan');

  if(!pl){
    el.innerHTML = `<div class="sec last"><div class="h-sec">Plan de dosificación</div>
      <div class="empty" style="margin-top:16px">Registra una medición para generar el plan</div>
      <div style="margin-top:16px"><button class="btn btn-primary" data-quick="test">+ MEDICIÓN</button></div></div>`;
    return;
  }

  const {cons, mant, correcciones, solA, solB, solMg, horas, separacion, obj} = pl;
  const faltan = [];
  if(!solA) faltan.push('Parte A (alcalinidad)');
  if(!solB) faltan.push('Parte B (calcio)');

  /* ── renglones del horario ── */
  const filas = [];
  const corrA = correcciones.find(c=>c.k==='kh' && c.mlDia);
  const corrB = correcciones.find(c=>c.k==='ca' && c.mlDia);
  const corrMg= correcciones.find(c=>c.k==='mg');

  const mlA = (mant.A?.ml||0) + (corrA?.mlDia||0);
  const mlB = (mant.B?.ml||0) + (corrB?.mlDia||0);
  if(mlA>0) filas.push({h:horas.A, n:'Parte A · alcalinidad', ml:mlA, sol:solA,
    det:[mant.A?`${fmt(mant.A.ml,1)} ml de mantenimiento`:null, corrA?`${fmt(corrA.mlDia,1)} ml de corrección`:null].filter(Boolean).join(' + ')});
  if(corrMg && corrMg.mlDia) filas.push({h:horas.Mg, n:'Magnesio', ml:corrMg.mlDia, sol:solMg, det:'corrección puntual'});
  if(mlB>0) filas.push({h:horas.B, n:'Parte B · calcio', ml:mlB, sol:solB,
    det:[mant.B?`${fmt(mant.B.ml,1)} ml de mantenimiento`:null, corrB?`${fmt(corrB.mlDia,1)} ml de corrección`:null].filter(Boolean).join(' + ')});
  filas.sort((a,b)=>a.h<b.h?-1:1);

  /* ── por qué ── */
  let porque;
  if(cons && cons.dkh>0){
    porque = `Tu consumo medido es ${fmt(cons.dkh,2)} dKH al día, equivalente a ${fmt(cons.ca,1)} ppm de calcio diarios por el acoplamiento 1 : ${ACOPLE}. `
      + (cons.huboDosis
          ? `Sale de comparar ${fmt(cons.khB,2)} → ${fmt(cons.khA,2)} dKH en ${Math.round(cons.dias)} días descontando los ${fmt(cons.dosisDkh,2)} dKH que dosificaste en ese lapso. `
          : `Sale de la caída de ${fmt(cons.khB,2)} a ${fmt(cons.khA,2)} dKH en ${Math.round(cons.dias)} días. Como no registraste dosis en ese periodo, es el consumo neto. `)
      + `La dosis de mantenimiento cubre exactamente eso.`;
  } else if(cons){
    porque = `Entre las dos últimas mediciones la alcalinidad no bajó (${fmt(cons.khB,2)} → ${fmt(cons.khA,2)} dKH en ${Math.round(cons.dias)} días), así que por ahora no hay consumo que reponer. Si ya dosificas a diario, mantén la dosis actual y vuelve a medir en una semana.`;
  } else {
    porque = `Hacen falta dos mediciones de alcalinidad para calcular el consumo. Con una sola solo puedo proponerte las correcciones puntuales.`;
  }

  el.innerHTML = `
    <div class="sec">
      <div class="row"><div class="h-sec">Plan</div><div class="spacer"></div>
        <div class="meta">a partir de la medición del ${fmtDate(pl.fecha)} · ${agoTxt(pl.fecha)}</div></div>
    </div>

    ${faltan.length?`<div class="mx note acc" style="margin-top:20px">
      <div class="kicker acc">Falta registrar ${plural(faltan.length,'una solución','soluciones')}</div>
      <div class="t">No tengo ${faltan.join(' ni ')}. Regístralas en <b>Soluciones</b> y el plan pasará de decirte cuánto falta a decirte cuántos mililitros echar.</div>
    </div>`:''}

    <div class="mx" style="margin-top:20px;border:2px solid var(--divider)">
      <div style="background:var(--ink);color:var(--bg);padding:10px 18px;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Mantenimiento diario</span>
        <span class="spacer"></span>
        <span style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.7">actualizado ${fmtDM(pl.fecha)}</span>
      </div>
      ${filas.length ? filas.map(f=>`
        <div class="plan-fila">
          <div class="hora num">${f.h}</div>
          <div class="qué">${f.n}${f.sol && f.sol.nombre.toLowerCase()!==f.n.toLowerCase()
            ?`<div class="tiny dim" style="text-transform:none;letter-spacing:0;font-weight:400">${esc(f.sol.nombre)}</div>`:''}</div>
          <div class="cuánto num">${fmt(f.ml,0)} ml</div>
          <div class="det">${esc(f.det||'')}</div>
        </div>`).join('')
      : `<div style="padding:20px 18px;color:var(--n700);font-size:14px">Nada que dosificar hoy: no hay consumo medido ni correcciones pendientes.</div>`}
      ${filas.length>1 ? `<div class="plan-nota">
        <b>No juntes la Parte A con la Parte B.</b> Si las echas al mismo tiempo o en el mismo punto precipitan al instante y pierdes las dos.
        Tu horario las separa ${fmt(separacion,0)} h${separacion<1?' — súbelo a 2–4 h en Ajustes':''}. Si no puedes separarlas en el tiempo, échalas en puntos opuestos del sump con la bomba de retorno corriendo.
      </div>`:''}
      ${notaVolumenes(pl)}
    </div>

    ${correcciones.length ? correcciones.map(c=>bloqueCorreccion(c, pl)).join('') : ''}

    <div class="mx note" style="margin-top:20px">
      <div class="kicker">Por qué estos números</div>
      <div class="t">${esc(porque)}</div>
    </div>

    <div class="sec">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${filas.length?`<button class="btn btn-primary" id="btnRegistrarHoy">REGISTRAR LAS DOSIS DE HOY</button>`:''}
        <button class="btn" data-quick="dosis">+ DOSIS MANUAL</button>
        <button class="btn" data-quick="test">+ MEDICIÓN</button>
      </div>
    </div>

    <div class="sec last">
      <div class="row"><div class="h-sub">Dosis registradas · ${S.doses.length}</div><div class="spacer"></div>
        <div class="meta">alimentan el cálculo de consumo</div></div>
      ${S.doses.length?`<div class="tbl-box" style="margin-top:16px"><table style="min-width:560px">
        <thead><tr><th>Fecha</th><th>Solución</th><th>ml</th><th>Efecto</th><th></th></tr></thead>
        <tbody>${[...S.doses].sort((a,b)=>a.date<b.date?1:-1).slice(0,40).map(d=>{
          const sol=S.solutions.find(s=>s.id===d.solutionId);
          const e=sol?efectoPorMl(sol):null;
          return `<tr>
            <td class="k">${fmtDate(d.date)}</td>
            <td>${sol?esc(sol.nombre):'<span class="dim">solución borrada</span>'}${d.correccion?' <span class="tag">corrección</span>':''}</td>
            <td>${fmt(d.ml,0)}</td>
            <td>${e?`+${fmt(e.delta*d.ml, e.unidad==='dKH'?3:1)} ${e.unidad}`:'—'}</td>
            <td><button class="lnk" data-del-dosis="${d.id}">✕</button></td></tr>`;
        }).join('')}</tbody></table></div>`
      :`<div class="empty" style="margin-top:16px">Sin dosis registradas. Regístralas para que la app mida tu consumo real.</div>`}
    </div>`;

  const btn = $('#btnRegistrarHoy');
  if(btn) btn.onclick = ()=>registrarDosisHoy(filas);
}

/* Con productos comerciales las dos partes casi nunca se dosifican en el mismo
   volumen. Verlo escrito evita que un 16 ml contra 2 ml parezca una errata. */
function notaVolumenes(pl){
  const A=pl.mant.A, B=pl.mant.B;
  if(!A || !B || !(A.ml>0) || !(B.ml>0)) return '';
  const r = A.ml/B.ml;
  if(r>0.8 && r<1.25) return '';
  const mayor = r>1 ? 'alcalinidad' : 'calcio';
  const razon = r>1 ? r : 1/r;
  return `<div class="plan-nota">
    <b>Las dos partes no llevan el mismo volumen, y así debe ser.</b>
    Te toca <b>${fmt(razon,1)} veces más ${mayor}</b> porque tus dos soluciones no tienen la misma potencia por ml:
    cada ml de la de alcalinidad sube ${fmt(efectoPorMl(A.sol).delta,4)} dKH y cada ml de la de calcio sube ${fmt(efectoPorMl(B.sol).delta,3)} ppm.
    Los ml de arriba ya están calculados para que entren acoplados a 1 dKH por cada ${ACOPLE} ppm de calcio, que es la proporción a la que los corales los consumen.
    Si dosificaras el mismo volumen de las dos, el ${r>1?'calcio se te dispararía':'la alcalinidad se te dispararía'} mientras ${r>1?'la alcalinidad':'el calcio'} se queda atrás.
  </div>`;
}

function bloqueCorreccion(c, pl){
  const p = P[c.k];
  if(c.bajar){
    return `<div class="mx note acc" style="margin-top:20px">
      <div class="kicker acc">${p.n} por encima del objetivo</div>
      <div class="t">Estás en ${fmt(c.de,p.dec)} ${p.u} contra un objetivo de ${fmt(c.a,p.dec)}. No hay nada que dosificar: suspende esa parte y deja que el consumo la baje sola, o adelanta un cambio de agua. Bajar ${p.n.toLowerCase()} a la fuerza no se hace.</div>
    </div>`;
  }
  const dias = c.dias;
  const lineas = Array.from({length:Math.min(dias,10)},(_,i)=>{
    let cant;
    if(c.mlDia!=null) cant = `${fmt(c.mlDia,0)} ml de ${esc(c.sol.nombre)}`;
    else if(c.k==='mg' && c.seco) cant = `${fmt(c.seco.gCl,1)} g de ${c.seco.formaCl.f} + ${fmt(c.seco.gSo,1)} g de ${c.seco.formaSo.f}`;
    else if(c.seco?.sal) cant = `${fmt(c.seco.g,1)} g de ${c.seco.forma.f}`;
    else cant = `${fmt(c.porDia,p.dec)} ${p.u}`;
    return `<div class="plan-fila dia"><div class="hora num">Día ${i+1}</div><div class="qué" style="grid-column:span 2">${cant}</div>
      <div class="det">${i===0?`+${fmt(c.porDia,p.dec)} ${p.u}`:''}</div></div>`;
  }).join('');

  return `<div class="mx" style="margin-top:20px;border:2px solid var(--divider)">
    <div style="background:var(--ink);color:var(--bg);padding:10px 18px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">
      Corrección pendiente · ${p.n} ${fmt(c.de,p.dec)} → ${fmt(c.a,p.dec)} ${p.u}
    </div>
    ${lineas}
    ${dias>10?`<div class="plan-nota">…y ${dias-10} días más al mismo ritmo.</div>`:''}
    <div class="plan-nota">Vuelve a medir el día ${dias+1}.
      ${c.repartido
        ? ` Lo reparto en ${dias} días porque el tope seguro es ${c.limite.rec} ${c.limite.u} al día${c.k==='kh'?' (1.0 dKH es el límite duro, y ya a 0.5 los SPS lo acusan)':''}: subir ${fmt(c.gap,p.dec)} ${p.u} de golpe estresa a los corales más de lo que ayuda cerrar la brecha rápido.`
        : ` Cabe en un solo día porque la brecha (${fmt(c.gap,p.dec)} ${p.u}) está por debajo del tope de ${c.limite.rec} ${c.limite.u} diarios.`}
      ${c.k==='mg' && !c.mlDia ? ` Va en seco y repartido entre las dos sales en proporción ${fmt(c.seco?.ratio||S.settings.mgRatio,1)} : 1 — usar solo cloruro mete cloruro de más y desbalancea la proporción iónica del agua. Disuélvelo antes en agua de osmosis y añádelo lento en zona de flujo.`:''}
      ${c.k==='mg' ? ` El magnesio no se consume por calcificación, así que esto es una corrección puntual, no una dosis diaria: una vez en rango se repone solo con los cambios de agua.`:''}
    </div>
  </div>`;
}

function registrarDosisHoy(filas){
  const fecha = today();
  let n=0;
  for(const f of filas){
    if(!f.sol || !(f.ml>0)) continue;
    S.doses.push({id:uid(), date:fecha, solutionId:f.sol.id, ml:+fmt(f.ml,1)});
    f.sol.restanteMl = Math.max(0, (+f.sol.restanteMl||0) - f.ml);
    n++;
  }
  if(!n) return toast('No hay dosis con solución asignada');
  save(); renderAll();
  toast(`${n} ${plural(n,'dosis registrada','dosis registradas')} con fecha de hoy`);
}

function dosisForm(){
  if(!S.solutions.length) return toast('Registra primero una solución');
  const body = `<form id="fDosis">
    <div class="f2">
      <div class="field"><label>Fecha</label><input type="date" name="date" value="${today()}" required></div>
      <div class="field"><label>Solución</label><select name="sol">${S.solutions.map(s=>{
        const e=efectoPorMl(s);
        return `<option value="${s.id}">${esc(s.nombre)}${e?` · ${fmt(e.delta,e.unidad==='dKH'?4:3)} ${e.unidad}/ml`:''}</option>`;
      }).join('')}</select></div>
      <div class="field"><label>Mililitros</label><input type="number" step="0.1" name="ml" required></div>
      <div class="field"><label>Tipo</label><select name="tipo">
        <option value="">Mantenimiento</option><option value="1">Corrección puntual</option></select></div>
    </div>
    <div class="note tight" id="dosisPrev"><div class="t dim">Captura los mililitros para ver el efecto.</div></div>
  </form>`;
  openModal('Registrar dosis', body, ()=>{
    const f=new FormData($('#fDosis'));
    const ml=+f.get('ml'); if(!(ml>0)) return toast('Captura los mililitros');
    const sol=S.solutions.find(s=>s.id===f.get('sol'));
    S.doses.push({id:uid(), date:f.get('date'), solutionId:f.get('sol'), ml, correccion:!!f.get('tipo')});
    if(sol) sol.restanteMl = Math.max(0,(+sol.restanteMl||0)-ml);
    save(); closeModal(); renderAll(); toast('Dosis registrada');
  });
  const upd=()=>{
    const f=$('#fDosis'); const sol=S.solutions.find(s=>s.id===f.sol.value);
    const ml=+f.ml.value, e=sol?efectoPorMl(sol):null;
    $('#dosisPrev').innerHTML = (e&&ml>0)
      ? `<div class="t">Sube <b>${fmt(e.delta*ml, e.unidad==='dKH'?3:2)} ${e.unidad}</b> en ${V()} L. Quedarían ${fmt(Math.max(0,(+sol.restanteMl||0)-ml),0)} ml en el bidón.</div>`
      : `<div class="t dim">Captura los mililitros para ver el efecto.</div>`;
  };
  $('#fDosis').addEventListener('input',upd);
  $('#fDosis').addEventListener('change',upd);
}
