/* ═══════════════════════════════════════════════════════════════════════
   v-soluciones.js — soluciones madre (§7.2), preparación (§7.4) y sales (§4).
   ═══════════════════════════════════════════════════════════════════════ */

function renderSoluciones(){
  const sols = [...S.solutions].sort((a,b)=> a.fecha<b.fecha?1:-1);

  const tarjetas = sols.map(sol=>{
    const k = concentracion(sol), e = efectoPorMl(sol), a = autonomia(sol);
    const esPot = sol.modo==='potencia';
    const sal = esPot ? null : salPorId(sol.saltId);
    const forma = sal ? formaDe(sal) : null;
    const pct = sol.volumenMl ? Math.max(0,Math.min(100,(+sol.restanteMl||0)/sol.volumenMl*100)) : 0;
    const alerta = a.dias!=null && a.dias<14;
    const subtitulo = esPot
      ? `${fmtAuto(sol.refDelta)} ${sol.tipo==='alk'?'dKH':'ppm'} por ${fmtAuto(sol.refMl)} ml en ${fmt(sol.refLitros,0)} L`
      : `${sal?esc(compuestoDe(sal).n):'sal borrada'}${forma?` · ${forma.f}`:''}${sal&&hidratoIncierto(sal)?' · <span class="bad">sin confirmar</span>':''}`;
    return `<div class="solc">
      <div class="row" style="gap:10px">
        <div class="nm">${esc(sol.nombre)}</div><div class="spacer"></div>
        <span class="tipo">${k?TIPO_N[k.tipo].toUpperCase():'—'}</span>
      </div>
      <div class="sp">${subtitulo}</div>
      <div class="gr gr-2 box" style="margin-top:14px">
        <div class="stat sm" style="padding:12px 14px">
          <div class="v">${esPot?fmt(sol.volumenMl,0)+' ml':fmt(sol.gramos,0)+' g'}</div>
          <div class="l">${esPot?'preparados':'en '+sol.volumenMl+' ml'}</div></div>
        <div class="stat sm" style="padding:12px 14px"><div class="v">${e?fmt(e.delta, e.unidad==='dKH'?4:3):'—'}</div><div class="l">${e?e.unidad+' por ml':'—'}</div></div>
      </div>
      <div class="tiny dim" style="margin-top:10px">
        ${esPot?'Producto comercial':'Concentración '+(k?fmt(k.c,3):'—')+' '+(k?.tipo==='alk'?'meq/ml':'mg/ml')} · preparada el ${fmtDate(sol.fecha)}
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

  const mias  = S.salts.filter(seUsa);
  const otras = S.salts.filter(s=>!seUsa(s));
  const filaSal = s=>{
    const c=compuestoDe(s), f=formaDe(s);
    const incierta=hidratoIncierto(s), riesgo = s.grado==='tecnico' && !s.coa;
    return `<tr>
      <td class="k">${c.n}</td>
      <td>${f.f}</td>
      <td class="${incierta?'oo':''}">${incierta?'Asumida anhidra':ESTADO_HID[s.estado]}</td>
      <td>${c.tipo==='alk'?`${fmt(f.ap,3)} meq/g`:`${fmt(f.ap,1)} mg/g · ${fmt(f.pct,2)} %`}</td>
      <td class="${riesgo?'oo':''}">${GRADOS[s.grado]}${s.coa?' · CoA':''}</td>
      <td>${esc(s.proveedor||'—')}</td>
      <td><button class="lnk" data-saledit="${s.id}">${seUsa(s)?'Ed.':'La tengo'}</button></td>
    </tr>`;
  };
  const tabla = arr => `<div class="tbl-box"><table style="min-width:820px">
      <thead><tr><th>Sal</th><th>Forma en uso</th><th>Hidrato</th><th>Aporte por gramo</th><th>Grado</th><th>Proveedor</th><th></th></tr></thead>
      <tbody>${arr.map(filaSal).join('')}</tbody></table></div>`;

  const inciertas = mias.filter(s=>hidratoIncierto(s));
  const sinCoa = mias.filter(s=>s.grado==='tecnico'&&!s.coa);

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
      <div class="row"><div class="h-sec">Sales a granel</div><div class="spacer"></div>
        <div class="meta">${mias.length?`${mias.length} en tu estante · el aporte por gramo cambia con el hidrato`:'no necesitas ninguna si dosificas con productos ya preparados'}</div></div>
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

    <div class="mx" style="margin-top:20px">
      ${mias.length
        ? tabla(mias)
        : `<div class="empty">No tienes sales a granel marcadas</div>
           <div class="note" style="margin-top:16px"><div class="kicker">Y está bien</div>
             <div class="t">Si dosificas con productos ya preparados —Red Sea, BRS y similares— no necesitas comprar sales sueltas:
               la potencia te la da el fabricante y la registras arriba, en <b>Mis soluciones</b>.
               Este catálogo solo hace falta para preparar tus propias soluciones a granel o para una corrección en seco.</div></div>`}
    </div>

    <div class="sec">
      <details ${mias.length?'':'open'}>
        <summary class="kicker" style="cursor:pointer">Catálogo de referencia · ${otras.length} ${plural(otras.length,'sal','sales')} que no tienes</summary>
        <div style="margin-top:16px">
          <div class="note" style="margin-bottom:16px"><div class="t">
            Estas son las constantes químicas que usa la app para las correcciones en seco.
            Si compras alguna, dale a <b>La tengo</b> y pasará a tu estante: solo entonces la app te pedirá confirmar el hidrato y te avisará del grado.</div></div>
          ${tabla(otras)}
        </div>
      </details>
    </div>

    <div class="sec last" style="padding-top:8px">
      <div class="note"><div class="kicker">${mias.length?'Bidones grandes':'Guardado'}</div>
        <div class="t">${mias.length
          ? 'Las soluciones son estables indefinidamente si se mantienen tapadas, así que conviene preparar bidones de 5 L en lugar de botellas chicas: menos trabajo y menos oportunidad de equivocarse en la receta.'
          : 'Tanto las soluciones caseras como las comerciales son estables indefinidamente mientras estén tapadas. Lo que sí conviene es anotar la fecha en el envase para saber cuánto lleva abierto.'}</div></div>
    </div>`;
}

/* ═══════════════ productos comerciales conocidos ═══════════════
   Guardan la potencia declarada por el fabricante para no teclearla.
   'potencia:null' significa que el dato hay que sacarlo del calculador
   de la marca; el formulario explica cómo.                              */
const PRESETS = {
  rs_alk:{ nombre:'Red Sea · alcalinidad', tipo:'alk', refDelta:0.034, refMl:1, refLitros:100, volumenMl:1000,
    nota:'Polvo Red Sea disuelto. Dato del fabricante: 1 ml por cada 100 L sube 0.034 dKH.' },
  rs_ca:{ nombre:'Red Sea · calcio', tipo:'ca', refDelta:2, refMl:1, refLitros:100, volumenMl:1000,
    nota:'Polvo Red Sea disuelto. Dato del fabricante: 1 ml por cada 100 L sube 2 ppm de calcio.' },
  /* Potencia leída del propio Reef Calculator de BRS y comprobada lineal en
     cuatro combinaciones de volumen y salto: 100 ppm con 213.04 ml en 100 L. */
  brs_mg:{ nombre:'BRS Liquid Magnesium Mix', tipo:'mg', refDelta:100, refMl:213.04, refLitros:100, volumenMl:3785,
    receta:'brs_mg',
    nota:'Premezcla BRS: 7¼ tazas de cloruro de magnesio y ½ taza de sulfato, en 1 galón. Baja en sulfato a propósito, pensada para ajustes grandes.' },
};

function solucionForm(id){
  const sol = id ? S.solutions.find(s=>s.id===id) : null;
  const modo = sol?.modo || 'potencia';
  const body = `<form id="fSol">
    ${!sol?`<div class="field"><label>Producto</label><select name="preset">
      <option value="">— lo preparo yo con sales a granel —</option>
      ${Object.entries(PRESETS).map(([k,p])=>`<option value="${k}">${esc(p.nombre)}</option>`).join('')}
      <option value="__pot">Otro producto comercial</option>
    </select></div>`:''}

    <div class="f2">
      <div class="field"><label>Nombre</label><input type="text" name="nombre" value="${esc(sol?.nombre||'')}" placeholder="Parte A · alcalinidad" required></div>
      <div class="field"><label>Cómo está definida</label><select name="modo">
        <option value="potencia" ${modo==='potencia'?'selected':''}>Por lo que sube cada ml</option>
        <option value="receta"   ${modo==='receta'?'selected':''}>Por gramos de sal que le puse</option>
      </select></div>
    </div>

    <div id="camposReceta">
      <div class="f2">
        <div class="field"><label>Sal</label><select name="salt">${
          [...S.salts].sort((a,b)=> (seUsa(b)?1:0)-(seUsa(a)?1:0)).map(s=>{
            const c=compuestoDe(s);
            return `<option value="${s.id}" ${sol?.saltId===s.id?'selected':''}>${c.n} · ${TIPO_N[c.tipo]}${seUsa(s)?'':' — no la tienes'}</option>`;
          }).join('')}</select></div>
        <div class="field"><label>Gramos de sal</label><input type="number" step="0.1" name="gramos" value="${sol?.gramos??''}"></div>
      </div>
      <label class="check"><input type="checkbox" name="horneado" ${sol?.horneado?'checked':''}>
        <span>Voy a hornear el bicarbonato para convertirlo en carbonato de sodio</span></label>
    </div>

    <div id="camposPotencia">
      <div class="field"><label>Qué corrige</label><select name="tipo">
        ${Object.entries(TIPO_N).map(([k,n])=>`<option value="${k}" ${sol?.tipo===k?'selected':''}>${n}</option>`).join('')}
      </select></div>
      <div class="f3">
        <div class="field"><label>Sube</label><input type="number" step="0.001" name="refDelta" value="${sol?.refDelta??''}" placeholder="0.034"></div>
        <div class="field"><label>Con estos ml</label><input type="number" step="0.1" name="refMl" value="${sol?.refMl??''}" placeholder="1"></div>
        <div class="field"><label>En estos litros</label><input type="number" step="1" name="refLitros" value="${sol?.refLitros??''}" placeholder="100"></div>
      </div>
      <div class="note tight"><div class="t dim" id="ayudaPot"></div></div>
    </div>

    <div class="f3" style="margin-top:16px">
      <div class="field"><label>Volumen preparado (ml)</label><input type="number" step="10" name="volumenMl" value="${sol?.volumenMl??1000}" required></div>
      <div class="field"><label>Volumen restante (ml)</label><input type="number" step="10" name="restanteMl" value="${sol?.restanteMl??''}" placeholder="igual al preparado"></div>
      <div class="field"><label>Fecha de preparación</label><input type="date" name="fecha" value="${sol?.fecha||today()}"></div>
    </div>
    <input type="hidden" name="nota" value="${esc(sol?.nota||'')}">
    <input type="hidden" name="receta" value="${esc(sol?.receta||'')}">
    <div class="note tight" id="solPrev" style="margin-top:16px"></div>
  </form>`;

  openModal(sol?'Editar solución':'Nueva solución', body, ()=>{
    const f=new FormData($('#fSol'));
    const vol=+f.get('volumenMl');
    if(!(vol>0)) return toast('Captura el volumen preparado');
    const m=f.get('modo');
    const data={nombre:f.get('nombre'), modo:m, volumenMl:vol, fecha:f.get('fecha'),
      restanteMl: f.get('restanteMl')===''? vol : +f.get('restanteMl'),
      nota:f.get('nota')||'', receta:f.get('receta')||''};
    if(m==='potencia'){
      const d=+f.get('refDelta'), rm=+f.get('refMl'), rl=+f.get('refLitros');
      if(!(d>0&&rm>0&&rl>0)) return toast('Faltan los tres datos de potencia');
      Object.assign(data,{tipo:f.get('tipo'), refDelta:d, refMl:rm, refLitros:rl, saltId:null, gramos:null});
    }else{
      const g=+f.get('gramos');
      if(!(g>0)) return toast('Captura los gramos de sal');
      let saltId=f.get('salt');
      if(f.get('horneado')){ const s=S.salts.find(x=>x.compuesto==='na2co3'); if(s) saltId=s.id; }
      Object.assign(data,{saltId, gramos:g, horneado:!!f.get('horneado'), tipo:null,
                          refDelta:null, refMl:null, refLitros:null});
    }
    if(sol) Object.assign(sol,data); else S.solutions.push({id:uid(), ...data});
    save(); closeModal(); renderAll(); toast('Solución guardada');
    if(!sol) setTimeout(()=>prepararModal(S.solutions[S.solutions.length-1].id), 80);
  }, 'wide');

  const f=$('#fSol');
  const aplicarPreset=()=>{
    const p=PRESETS[f.preset?.value];
    if(!p) return;
    f.modo.value='potencia'; f.nombre.value=p.nombre; f.tipo.value=p.tipo;
    f.refDelta.value=p.refDelta??''; f.refMl.value=p.refMl??''; f.refLitros.value=p.refLitros??'';
    f.volumenMl.value=p.volumenMl; f.restanteMl.value='';
    f.nota.value=p.nota||''; f.receta.value=p.receta||'';
  };
  const upd=()=>{
    const m=f.modo.value;
    $('#camposReceta').style.display  = m==='receta'   ? '' : 'none';
    $('#camposPotencia').style.display= m==='potencia' ? '' : 'none';

    $('#ayudaPot').innerHTML = f.preset?.value==='brs_mg'
      ? `Sacado del <b>Reef Calculator</b> de BRS: para subir 100 ppm en 100 L pide 213.04 ml. Se comprobó que la relación es lineal, así que sirve para cualquier volumen y cualquier salto.`
      : `Es el dato que trae el fabricante, del estilo «1 ml por cada 100 L sube 0.034 dKH». También sirve un resultado de la calculadora de la marca: la diferencia que buscabas, los ml que te dio y el volumen que pusiste.`;

    const prev=$('#solPrev');
    let tmp;
    if(m==='potencia'){
      tmp={modo:'potencia', tipo:f.tipo.value, refDelta:+f.refDelta.value,
           refMl:+f.refMl.value, refLitros:+f.refLitros.value, volumenMl:+f.volumenMl.value};
    }else{
      let salId=f.salt.value;
      if(f.horneado.checked){ const s=S.salts.find(x=>x.compuesto==='na2co3'); if(s) salId=s.id; }
      tmp={modo:'receta', saltId:salId, gramos:+f.gramos.value, volumenMl:+f.volumenMl.value};
    }
    const k=concentracion(tmp), e=efectoPorMl(tmp);
    if(!k||!e){ prev.innerHTML='<div class="t dim">Completa los datos para ver cuánto sube cada ml.</div>'; return; }
    const sal = k.sal;
    prev.innerHTML=`<div class="t">
      Cada ml sube <b>${fmt(e.delta, e.unidad==='dKH'?4:3)} ${e.unidad}</b> en tus ${V()} L netos;
      10 ml suben ${fmt(e.delta*10, e.unidad==='dKH'?3:2)} ${e.unidad}.
      Con ${fmt(tmp.volumenMl,0)} ml tienes para subir ${fmt(e.delta*tmp.volumenMl, e.unidad==='dKH'?1:0)} ${e.unidad} en total.
      ${sal?`<br>Concentración ${fmt(k.c,3)} ${k.tipo==='alk'?'meq/ml':'mg/ml'} usando ${formaDe(sal).f}${hidratoIncierto(sal)?' <b class="bad">(asumido anhidro, sin confirmar)</b>':''}.`:''}
      ${m==='receta'&&f.horneado.checked?'<br>Con el horneado la receta ya usa las constantes del Na₂CO₃.':''}
    </div>`;
  };
  if(f.preset) f.preset.addEventListener('change', ()=>{ aplicarPreset(); upd(); });
  f.addEventListener('input',upd);
  f.addEventListener('change',upd);
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
  if(sol.modo==='potencia') return prepararComercial(sol);
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

/* ── preparación de un producto comercial (modo potencia) ── */
function prepararComercial(sol){
  const e = efectoPorMl(sol), k = concentracion(sol);
  const lim = LIM[sol.tipo];
  const esBRS = sol.receta==='brs_mg';

  const pasos = esBRS ? [
    `Llena un garrafón de <b>1 galón (3.785 L)</b> hasta <b>la mitad</b> con agua de <b>osmosis inversa (RO/DI)</b> o destilada. Nunca agua de la llave.`,
    `Vacía dentro <b>todo el contenido del sobre</b>: son 7¼ tazas de cloruro de magnesio y ½ taza de sulfato de magnesio, ya pesadas de fábrica.`,
    `Tapa y <b>agita unos 10 segundos</b> para arrancar la disolución.`,
    `Destapa y <b>termina de llenar</b> el garrafón con osmosis hasta el galón completo.`,
    `Agita otra vez y <b>déjalo reposar hasta que no quede nada de sal sin disolver</b> antes de usarlo. No lo dosifiques turbio.`,
    `Etiqueta el garrafón: <b>${esc(sol.nombre)} · magnesio · 1 galón · ${fmtDate(sol.fecha)}</b>.`,
  ] : [
    `Prepáralo siguiendo las instrucciones del fabricante, siempre con agua de <b>osmosis inversa (RO/DI)</b>.`,
    `Aforo final: <b>${fmt(sol.volumenMl,0)} ml</b>. El volumen final es el que manda en la concentración.`,
    `Etiqueta el envase: <b>${esc(sol.nombre)} · ${TIPO_N[sol.tipo]} · ${fmt(sol.volumenMl,0)} ml · ${fmtDate(sol.fecha)}</b>.`,
  ];

  const body = `
    <div class="gr gr-2 box">
      <div class="stat sm"><div class="v">${e?fmt(e.delta, e.unidad==='dKH'?4:3):'—'}</div><div class="l">${e?e.unidad+' por ml':'—'}</div></div>
      <div class="stat sm"><div class="v">${fmt(sol.volumenMl,0)} ml</div><div class="l">preparados</div></div>
    </div>

    ${sol.nota?`<div class="note" style="margin-top:20px"><div class="kicker">El producto</div>
      <div class="t">${esc(sol.nota)}</div></div>`:''}

    ${esBRS?`<div class="note acc" style="margin-top:16px">
      <div class="kicker acc">Por qué esta mezcla lleva tan poco sulfato</div>
      <div class="t">BRS la diseñó para <b>ajustes grandes</b>: en una corrección fuerte, meter mucho sulfato desbalancea el agua.
        Para reposición diaria en dosificación de dos partes se usa justo lo contrario, una mezcla con más sulfato.
        Por eso su proporción (unas 14 partes de cloruro por 1 de sulfato en volumen) es mucho más baja en sulfato que
        la mezcla ${fmt(S.settings.mgRatio,1)} : 1 en masa que la app propone para correcciones en seco.</div></div>`:''}

    <div style="margin-top:20px">
      <div class="h-sub">Paso a paso</div>
      <ol class="pasos">${pasos.map(p=>`<li>${p}</li>`).join('')}</ol>
    </div>

    <div class="note" style="margin-top:8px">
      <div class="kicker">Lo que rinde en tu acuario</div>
      <div class="t">${e?`De fábrica: <b>${fmtAuto(sol.refDelta)} ${e.unidad}</b> por cada ${fmtAuto(sol.refMl)} ml en ${fmt(sol.refLitros,0)} L.
        En tus <b>${V()} L netos</b> eso son <b>${fmt(e.delta, e.unidad==='dKH'?4:3)} ${e.unidad} por ml</b>.
        Para subir ${lim?`el tope diario de ${lim.rec} ${lim.u}`:'una unidad'} necesitas
        <b>${lim?fmt(mlPara(sol,lim.rec),0):fmt(mlPara(sol,1),0)} ml</b>.
        El envase completo da para <b>${fmt(e.delta*sol.volumenMl, e.unidad==='dKH'?1:0)} ${e.unidad}</b>.`
        :'Faltan los datos de potencia para calcularlo.'}</div>
    </div>

    <div class="note" style="margin-top:16px">
      <div class="kicker">Al dosificar</div>
      <div class="t">Añádelo <b>poco a poco</b> en zona de alto flujo —la salida de una bomba o un bafle del sump—, nunca de golpe.
        ${sol.tipo==='mg'?'BRS recomienda no mover el magnesio más de 100 ppm al día; la app usa un tope más conservador de 50 ppm.':''}
        ${sol.tipo!=='mg'?'Y recuerda no juntarlo en el tiempo con la otra parte.':''}</div>
    </div>`;
  openModal('Preparar · '+sol.nombre, body, null, 'wide');
}

/* ═══════════════ edición de una sal (§4) ═══════════════ */
function salForm(id){
  const sal=salPorId(id); if(!sal) return;
  const c=compuestoDe(sal);
  const body=`<form id="fSal">
    <div class="note tight" style="margin-bottom:18px"><div class="t"><b>${c.n}</b> — ${Object.values(c.formas).map(f=>`${f.f} (${c.tipo==='alk'?fmt(f.ap,3)+' meq/g':fmt(f.ap,1)+' mg/g'})`).join(' · ')}</div></div>

    <label class="check" style="margin-bottom:18px"><input type="checkbox" name="tengo" ${sal.tengo?'checked':''}>
      <span><b>La tengo en el estante.</b> Márcala solo si compraste esta sal a granel.
      Si dosificas con un producto ya preparado, déjala sin marcar y la app dejará de pedirte datos sobre ella.</span></label>

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
    sal.tengo=!!f.get('tengo');
    if(!c.fijo) sal.estado=f.get('estado');
    sal.grado=f.get('grado'); sal.coa=!!f.get('coa');
    sal.proveedor=f.get('proveedor'); sal.fechaCompra=f.get('fechaCompra');
    save(); closeModal(); renderAll(); toast(sal.tengo?'Añadida a tu estante':'Sal actualizada');
  });
  const upd=()=>{
    const f=$('#fSal'), av=$('#salAviso'); let h='';
    if(!f.tengo.checked){
      $('#salAviso').innerHTML=`<div class="note"><div class="t dim">Como no la tienes marcada, la app no te va a pedir confirmar el hidrato ni te avisará del grado. Solo la usa como constante de referencia para las correcciones en seco.</div></div>`;
      return;
    }
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
  $('#fSal').addEventListener('change',upd);
  $('#fSal').addEventListener('input',upd);
  upd();
}
