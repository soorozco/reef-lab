/* ═══════════════════════════════════════════════════════════════════════
   v-soluciones.js — soluciones madre (§7.2), preparación (§7.4) y sales (§4).
   ═══════════════════════════════════════════════════════════════════════ */

function renderSoluciones(){
  const sols = [...S.solutions].sort((a,b)=> a.fecha<b.fecha?1:-1);

  const tarjetas = sols.map(sol=>{
    const k = concentracion(sol), e = efectoPorMl(sol), a = autonomia(sol);
    const sal = salPorId(sol.saltId), forma = sal?formaDe(sal):null;
    const pct = sol.volumenMl ? Math.max(0,Math.min(100,(+sol.restanteMl||0)/sol.volumenMl*100)) : 0;
    const alerta = a.dias!=null && a.dias<14;
    return `<div class="solc">
      <div class="row" style="gap:10px">
        <div class="nm">${esc(sol.nombre)}</div><div class="spacer"></div>
        <span class="tipo">${k?TIPO_N[k.tipo].toUpperCase():'—'}</span>
      </div>
      <div class="sp">${sal?esc(compuestoDe(sal).n):'sal borrada'}${forma?` · ${forma.f}`:''}${hidratoIncierto(sal||{})?' · <span class="bad">sin confirmar</span>':''}</div>
      <div class="gr gr-2 box" style="margin-top:14px">
        <div class="stat sm" style="padding:12px 14px"><div class="v">${sol.gramos} g</div><div class="l">en ${sol.volumenMl} ml</div></div>
        <div class="stat sm" style="padding:12px 14px"><div class="v">${e?fmt(e.delta, e.unidad==='dKH'?4:3):'—'}</div><div class="l">${e?e.unidad+' por ml':'—'}</div></div>
      </div>
      <div class="tiny dim" style="margin-top:10px">
        Concentración ${k?fmt(k.c,3):'—'} ${k?.tipo==='alk'?'meq/ml':'mg/ml'} · preparada el ${fmtDate(sol.fecha)}
      </div>
      <div class="row" style="margin-top:12px;gap:10px">
        <span class="kicker">Restante</span><span class="spacer"></span>
        <span class="num tiny" style="font-weight:800">${Math.round(sol.restanteMl||0)} / ${sol.volumenMl} ml</span>
      </div>
      <div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div>
      <div class="tiny ${alerta?'bad':'dim'}" style="margin-top:8px;font-weight:${alerta?700:400}">
        ${a.dias!=null
          ? `${a.dias} ${plural(a.dias,'día','días')} de autonomía a ${fmt(a.ml,1)} ml/día de mantenimiento${a.corr>0?`, ya descontados los ${fmt(a.corr,0)} ml de la corrección pendiente`:''}${alerta?' — prepara el siguiente bidón':''}`
          : 'Sin dosis diaria asignada en el plan'}
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-sm" data-prep="${sol.id}">CÓMO PREPARARLA</button>
        <button class="btn btn-sm" data-rellenar="${sol.id}">RELLENAR</button>
        <button class="btn btn-sm" data-soledit="${sol.id}">EDITAR</button>
        <span class="spacer"></span>
        <button class="lnk" data-soldel="${sol.id}">Eliminar</button>
      </div>
    </div>`;
  }).join('');
  /* completa la fila para que no asome el fondo de la retícula */
  const relleno = sols.length ? '<div class="solc fill"></div>'.repeat((3 - sols.length % 3) % 3) : '';

  const filasSal = S.salts.map(s=>{
    const c=compuestoDe(s), f=formaDe(s);
    const incierta=hidratoIncierto(s), riesgo = s.grado==='tecnico' && !s.coa;
    return `<tr>
      <td class="k">${c.n}</td>
      <td>${f.f}</td>
      <td class="${incierta?'oo':''}">${incierta?'Asumida anhidra':ESTADO_HID[s.estado]}</td>
      <td>${c.tipo==='alk'?`${fmt(f.ap,3)} meq/g`:`${fmt(f.ap,1)} mg/g · ${fmt(f.pct,2)} %`}</td>
      <td class="${riesgo?'oo':''}">${GRADOS[s.grado]}${s.coa?' · CoA':''}</td>
      <td>${esc(s.proveedor||'—')}</td>
      <td><button class="lnk" data-saledit="${s.id}">Ed.</button></td>
    </tr>`;
  }).join('');

  const inciertas = S.salts.filter(s=>hidratoIncierto(s));
  const sinCoa = S.salts.filter(s=>s.grado==='tecnico'&&!s.coa);

  $('#v-soluciones').innerHTML = `
    <div class="sec">
      <div class="row"><div class="h-sec">Mis soluciones</div><div class="spacer"></div>
        <button class="btn btn-primary" data-quick="sol">+ SOLUCIÓN</button></div>
    </div>
    ${sols.length
      ? `<div class="gr gr-3 box mx" style="margin-top:20px">${tarjetas}${relleno}</div>`
      : `<div class="sec"><div class="empty" style="margin-top:4px">
           Sin soluciones. Registra tu Parte A y tu Parte B para que el plan te dé mililitros en vez de dKH.</div></div>`}

    <div class="sec" style="padding-top:36px">
      <div class="row"><div class="h-sec">Sales</div><div class="spacer"></div>
        <div class="meta">el aporte por gramo cambia con el hidrato</div></div>
    </div>

    ${inciertas.length?`<div class="mx note acc" style="margin-top:20px">
      <div class="kicker acc">${inciertas.length} ${plural(inciertas.length,'sal sin confirmar','sales sin confirmar')}</div>
      <div class="t">
        Estoy calculando con la forma <b>anhidra</b>, que es la más concentrada, para que te quedes corto en lugar de pasarte:
        quedarse corto se corrige subiendo la dosis, pero pasarse de calcio dispara precipitación y te tumba la alcalinidad.<br><br>
        <b>Cómo distinguirlas a simple vista:</b> el anhidro es polvo o perlitas muy finas, extremadamente higroscópico —se apelmaza o se humedece solo si dejas la bolsa abierta— y se calienta muchísimo al disolverse.
        El hidratado viene en hojuelas o granos más grandes y se calienta bastante menos.<br><br>
        <b>Qué preguntarle al proveedor:</b> <i>«¿El producto es anhidro o hidratado? ¿Manejan ficha técnica o certificado de análisis?»</i>
      </div>
    </div>`:''}

    ${sinCoa.length?`<div class="mx note acc" style="margin-top:20px">
      <div class="kicker acc">Grado industrial sin certificado</div>
      <div class="t">${sinCoa.map(s=>compuestoDe(s).n).join(', ')}. El grado técnico puede traer metales pesados que los corales acusan en partes por billón,
        muy por debajo de los límites que regula el grado alimenticio. El cloruro de calcio es el más variable porque proviene de salmueras naturales.
        Pide el certificado de análisis o cámbiate a grado alimenticio/USP.</div>
    </div>`:''}

    <div class="mx tbl-box" style="margin-top:20px"><table style="min-width:820px">
      <thead><tr><th>Sal</th><th>Forma en uso</th><th>Hidrato</th><th>Aporte por gramo</th><th>Grado</th><th>Proveedor</th><th></th></tr></thead>
      <tbody>${filasSal}</tbody></table></div>

    <div class="sec last" style="padding-top:24px">
      <div class="note"><div class="kicker">Bidones grandes</div>
        <div class="t">Las soluciones son estables indefinidamente si se mantienen tapadas, así que conviene preparar bidones de 5 L en lugar de botellas chicas: menos trabajo y menos oportunidad de equivocarse en la receta.</div></div>
    </div>`;
}

/* ═══════════════ alta y edición de solución ═══════════════ */
function solucionForm(id){
  const sol = id ? S.solutions.find(s=>s.id===id) : null;
  const body = `<form id="fSol">
    <div class="f2">
      <div class="field"><label>Nombre</label><input type="text" name="nombre" value="${esc(sol?.nombre||'')}" placeholder="Parte A · alcalinidad" required></div>
      <div class="field"><label>Sal</label><select name="salt">${S.salts.map(s=>{
        const c=compuestoDe(s);
        return `<option value="${s.id}" ${sol?.saltId===s.id?'selected':''}>${c.n} · ${TIPO_N[c.tipo]}</option>`;
      }).join('')}</select></div>
      <div class="field"><label>Gramos de sal</label><input type="number" step="0.1" name="gramos" value="${sol?.gramos??''}" required></div>
      <div class="field"><label>Volumen final (ml)</label><input type="number" step="10" name="volumenMl" value="${sol?.volumenMl??5000}" required></div>
      <div class="field"><label>Fecha de preparación</label><input type="date" name="fecha" value="${sol?.fecha||today()}"></div>
      <div class="field"><label>Volumen restante (ml)</label><input type="number" step="10" name="restanteMl" value="${sol?.restanteMl??''}" placeholder="igual al volumen final"></div>
    </div>
    <label class="check"><input type="checkbox" name="horneado" ${sol?.horneado?'checked':''}>
      <span>Voy a hornear el bicarbonato para convertirlo en carbonato de sodio</span></label>
    <div class="note tight" id="solPrev" style="margin-top:16px"></div>
  </form>`;

  openModal(sol?'Editar solución':'Nueva solución', body, ()=>{
    const f=new FormData($('#fSol'));
    const vol=+f.get('volumenMl'), g=+f.get('gramos');
    if(!(vol>0)||!(g>0)) return toast('Captura gramos y volumen');
    let saltId=f.get('salt');
    if(f.get('horneado')){ const s=S.salts.find(x=>x.compuesto==='na2co3'); if(s) saltId=s.id; }
    const data={nombre:f.get('nombre'), saltId, gramos:g, volumenMl:vol, fecha:f.get('fecha'),
      restanteMl: f.get('restanteMl')===''? vol : +f.get('restanteMl'), horneado:!!f.get('horneado')};
    if(sol) Object.assign(sol,data); else S.solutions.push({id:uid(), ...data});
    save(); closeModal(); renderAll(); toast('Solución guardada');
    if(!sol) setTimeout(()=>prepararModal(S.solutions[S.solutions.length-1].id), 80);
  }, 'wide');

  const upd=()=>{
    const f=$('#fSol');
    let salId=f.salt.value;
    if(f.horneado.checked){ const s=S.salts.find(x=>x.compuesto==='na2co3'); if(s) salId=s.id; }
    const sal=salPorId(salId);
    const tmp={saltId:salId, gramos:+f.gramos.value, volumenMl:+f.volumenMl.value};
    const k=concentracion(tmp), e=efectoPorMl(tmp);
    const prev=$('#solPrev');
    if(!k||!e||!(tmp.gramos>0)){ prev.innerHTML='<div class="t dim">Captura gramos y volumen para ver la concentración.</div>'; return; }
    const forma=formaDe(sal);
    prev.innerHTML=`<div class="t">
      Concentración <b>${fmt(k.c,3)} ${k.tipo==='alk'?'meq/ml':'mg/ml'}</b> usando ${forma.f}${hidratoIncierto(sal)?' <b class="bad">(asumido anhidro, sin confirmar)</b>':''}.<br>
      Cada ml sube <b>${fmt(e.delta, e.unidad==='dKH'?4:3)} ${e.unidad}</b> en tus ${V()} L netos. 10 ml suben ${fmt(e.delta*10, e.unidad==='dKH'?3:2)} ${e.unidad}.
      ${f.horneado.checked?'<br>Con el horneado la receta ya usa las constantes del Na₂CO₃.':''}
    </div>`;
  };
  $('#fSol').addEventListener('input',upd);
  $('#fSol').addEventListener('change',upd);
  upd();
}

function rellenarSolucion(id){
  const sol=S.solutions.find(s=>s.id===id); if(!sol) return;
  const body=`<form id="fRell">
    <div class="field"><label>Volumen actual en el bidón (ml)</label>
      <input type="number" step="10" name="ml" value="${sol.volumenMl}" required></div>
    <div class="note tight"><div class="t dim">Si preparaste un bidón nuevo con la misma receta, deja el volumen completo (${sol.volumenMl} ml). Si solo estás corrigiendo la estimación, pon lo que midas.</div></div>
  </form>`;
  openModal('Rellenar · '+sol.nombre, body, ()=>{
    sol.restanteMl = +new FormData($('#fRell')).get('ml')||0;
    save(); closeModal(); renderAll(); toast('Volumen actualizado');
  });
}

/* ═══════════════ instrucciones de preparación (§7.4) ═══════════════ */
function prepararModal(id){
  const sol=S.solutions.find(s=>s.id===id); if(!sol) return;
  const sal=salPorId(sol.saltId); if(!sal) return;
  const c=compuestoDe(sal), forma=formaDe(sal);
  const k=concentracion(sol), e=efectoPorMl(sol);
  const esAnhidroCa = c.tipo==='ca' && forma===c.formas.anhidro;
  const esBicarb = sal.compuesto==='nahco3';
  const esCarbonato = sal.compuesto==='na2co3';
  const litros = (sol.volumenMl/1000);
  const nahco3Necesario = esCarbonato ? sol.gramos/0.6308 : null;

  const pasos = [];
  pasos.push(`Pesa <b>${fmt(sol.gramos,1)} g</b> de ${c.n} (${forma.f}).${hidratoIncierto(sal)?' <b class="bad">Ojo:</b> como el hidrato no está confirmado, esta cantidad asume la forma anhidra. Si resulta que es hidratada, la solución quedará más floja de lo calculado y tendrás que subir la dosis — que es el error seguro.':''}`);
  pasos.push(`Parte de <b>${fmt(sol.volumenMl*0.8,0)} ml</b> de <b>agua de osmosis inversa (RO/DI)</b>. Nunca agua de la llave: trae fosfatos, silicatos y metales que vas a estar metiendo al acuario todos los días.`);
  if(esAnhidroCa){
    pasos.push(`<b>Cuidado con el calor.</b> El cloruro de calcio anhidro libera muchísimo calor al disolverse. No lo prepares directamente en el bidón: usa una cubeta, <b>agrega el polvo al agua poco a poco</b> —nunca agua sobre el polvo— agitando entre cada añadido.`);
    pasos.push(`Deja enfriar a temperatura ambiente antes de trasvasar al bidón. Si lo embotellas caliente, el envase se deforma y al enfriarse te queda en depresión.`);
  } else if(esBicarb || esCarbonato){
    pasos.push(`El bicarbonato hace lo contrario que el calcio: <b>se enfría y tarda en disolver</b>. Usa agua tibia y ten paciencia, agitando cada tanto. Si queda turbio, dale más tiempo antes de dar por perdida la disolución.`);
  } else {
    pasos.push(`Agrega la sal poco a poco al agua, agitando, hasta que no quede nada sin disolver.`);
  }
  pasos.push(`Completa con agua de osmosis hasta el aforo de <b>${sol.volumenMl} ml</b> exactos. El volumen final es el que manda en la concentración, no el agua con la que empezaste.`);
  pasos.push(`Etiqueta el bidón: <b>${esc(sol.nombre)} · ${c.n} · ${forma.f} · ${fmt(sol.gramos,1)} g / ${sol.volumenMl} ml · ${fmtDate(sol.fecha)}</b>.`);

  const body = `
    <div class="gr gr-2 box">
      <div class="stat sm"><div class="v">${fmt(sol.gramos,1)} g</div><div class="l">${c.n}</div></div>
      <div class="stat sm"><div class="v">${sol.volumenMl} ml</div><div class="l">volumen final</div></div>
    </div>

    ${esCarbonato && sol.horneado ? `<div class="note acc" style="margin-top:20px">
      <div class="kicker acc">Hornear el bicarbonato primero</div>
      <div class="t">Extiende <b>${fmt(nahco3Necesario,0)} g de bicarbonato (NaHCO₃)</b> en una charola y hornéalo a <b>180–200 °C durante una hora</b>.
        Pierde agua y CO₂ y te quedan los <b>${fmt(sol.gramos,1)} g de carbonato de sodio (Na₂CO₃)</b> de la receta —el rendimiento es del 63 %.
        Déjalo enfriar tapado, porque recaptura humedad del aire.<br><br>
        Sirve para subir alcalinidad <b>sin bajar el pH</b>: el carbonato empuja el pH hacia arriba mientras que el bicarbonato lo deja igual o lo baja un poco.
        Si tu pH ya anda alto, quédate con el bicarbonato sin hornear.</div>
    </div>`:''}

    <div style="margin-top:20px">
      <div class="h-sub">Paso a paso</div>
      <ol class="pasos">${pasos.map(p=>`<li>${p}</li>`).join('')}</ol>
    </div>

    <div class="note" style="margin-top:8px">
      <div class="kicker">Lo que rinde</div>
      <div class="t">Quedan <b>${fmt(k.c,3)} ${k.tipo==='alk'?'meq/ml':'mg/ml'}</b>.
        En tus <b>${V()} L netos</b>, cada ml sube <b>${fmt(e.delta, e.unidad==='dKH'?4:3)} ${e.unidad}</b>;
        100 ml suben ${fmt(e.delta*100, e.unidad==='dKH'?2:1)} ${e.unidad}.
        Con ${litros} L de solución tienes para ${(()=>{const a=autonomia({...sol, restanteMl:sol.volumenMl}); return a.dias!=null?`unos ${a.dias} días al ritmo actual`:'un buen rato';})()}.</div>
    </div>

    <div class="note" style="margin-top:16px">
      <div class="kicker">Guardado</div>
      <div class="t">Tapada, la solución es estable indefinidamente. Por eso conviene preparar bidones de 5 L en lugar de botellas chicas: haces la receta una vez cada varios meses en vez de cada dos semanas.</div>
    </div>`;
  openModal('Preparar · '+sol.nombre, body, null, 'wide');
}

/* ═══════════════ edición de una sal (§4) ═══════════════ */
function salForm(id){
  const sal=salPorId(id); if(!sal) return;
  const c=compuestoDe(sal);
  const body=`<form id="fSal">
    <div class="note tight" style="margin-bottom:18px"><div class="t"><b>${c.n}</b> — ${Object.values(c.formas).map(f=>`${f.f} (${c.tipo==='alk'?fmt(f.ap,3)+' meq/g':fmt(f.ap,1)+' mg/g'})`).join(' · ')}</div></div>
    ${c.fijo?'':`<div class="field"><label>Estado del hidrato</label><select name="estado">
      ${Object.entries(ESTADO_HID).map(([k,n])=>`<option value="${k}" ${sal.estado===k?'selected':''}>${n}</option>`).join('')}</select>
      <div class="tiny dim" style="margin-top:6px">Sin confirmar, la app calcula con la forma anhidra para que te quedes corto en vez de pasarte.</div></div>`}
    <div class="f2">
      <div class="field"><label>Grado</label><select name="grado">
        ${Object.entries(GRADOS).map(([k,n])=>`<option value="${k}" ${sal.grado===k?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Certificado de análisis</label><select name="coa">
        <option value="" ${!sal.coa?'selected':''}>No tengo CoA</option>
        <option value="1" ${sal.coa?'selected':''}>Sí, tengo CoA</option></select></div>
      <div class="field"><label>Proveedor</label><input type="text" name="proveedor" value="${esc(sal.proveedor||'')}"></div>
      <div class="field"><label>Fecha de compra</label><input type="date" name="fechaCompra" value="${sal.fechaCompra||''}"></div>
    </div>
    <div id="salAviso"></div>
  </form>`;
  openModal(c.n, body, ()=>{
    const f=new FormData($('#fSal'));
    if(!c.fijo) sal.estado=f.get('estado');
    sal.grado=f.get('grado'); sal.coa=!!f.get('coa');
    sal.proveedor=f.get('proveedor'); sal.fechaCompra=f.get('fechaCompra');
    save(); closeModal(); renderAll(); toast('Sal actualizada');
  });
  const upd=()=>{
    const f=$('#fSal'), av=$('#salAviso'); let h='';
    if(!c.fijo && f.estado.value==='desconocido'){
      h+=`<div class="note acc"><div class="kicker acc">Cómo distinguirlas</div><div class="t">
        El <b>anhidro</b> es polvo o perlitas muy finas, extremadamente higroscópico —se apelmaza o se humedece solo si dejas la bolsa abierta— y se calienta muchísimo al disolverse.
        El <b>hidratado</b> viene en hojuelas o granos más grandes y se calienta bastante menos.<br><br>
        Para el proveedor: <i>«¿El producto es anhidro o hidratado? ¿Manejan ficha técnica o certificado de análisis?»</i></div></div>`;
    }
    if(f.grado.value==='tecnico' && !f.coa.value){
      h+=`<div class="note acc" style="margin-top:14px"><div class="kicker acc">Grado industrial sin certificado</div><div class="t">
        Puede traer metales pesados que los corales acusan en partes por billón, muy por debajo de los límites que regula el grado alimenticio.
        ${sal.compuesto==='cacl2'?'El cloruro de calcio es justo el más variable, porque proviene de salmueras naturales.':''}
        Pide el CoA o cámbiate a grado alimenticio/USP.</div></div>`;
    }
    av.innerHTML=h;
  };
  $('#fSal').addEventListener('change',upd); upd();
}
