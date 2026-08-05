/* ═══════════════════════════════════════════════════════════════════════
   quimica.js — conversiones (§5), reglas de seguridad (§6), plan (§7.3).
   Todo se calcula sobre el VOLUMEN NETO.
   ═══════════════════════════════════════════════════════════════════════ */

const DKH_MEQ   = 0.357;    /* 1 dKH = 0.357 meq/L */
const MEQ_DKH   = 2.80;     /* 1 meq/L = 2.80 dKH  */
const PPM_CACO3 = 17.848;   /* 1 dKH = 17.848 ppm CaCO₃ */
const ACOPLE    = 7.15;     /* 1 dKH consumido ↔ 7.15 ppm Ca */

/* Límites diarios (§6). 'rec' es lo recomendado; 'max' el tope duro. */
const LIM = {
  kh:{rec:0.5, max:1.0, u:'dKH'},
  ca:{rec:50,  max:50,  u:'ppm'},
  mg:{rec:50,  max:50,  u:'ppm'},
  sal:{rec:0.5,max:0.5, u:'ppt'},
};

/* ── sales ── */
function compuestoDe(sal){ return COMPUESTOS[sal.compuesto]; }
/* Si el hidrato no está confirmado se asume ANHIDRO: la forma más concentrada.
   Así la receta se queda corta en vez de pasarse, y quedarse corto se corrige. */
function formaDe(sal){
  const c = compuestoDe(sal);
  if(c.fijo) return c.formas.anhidro;
  return sal.estado==='confirmado_hidratado' ? c.formas.hidratado : c.formas.anhidro;
}
const aporteDe = sal => formaDe(sal).ap;
const tipoDeSal = sal => compuestoDe(sal).tipo;
const salPorId = id => S.salts.find(s=>s.id===id);
const hidratoIncierto = sal => !compuestoDe(sal).fijo && sal.estado==='desconocido';

/* ── soluciones madre (§5) ──
   C_alcalinidad [meq/ml] = (g × meq/g) / ml
   C_ion        [mg/ml]   = (g × mg/g)  / ml                                */
function concentracion(sol){
  if(!sol) return null;

  /* Producto comercial: se conoce cuánto sube cada ml, no qué lleva dentro.
     Se traduce a la misma 'c' que usa el modo receta para que todo lo de
     abajo (dosis, plan, autonomía) siga funcionando igual.
       ion : c [mg/ml]  = Δppm × litros / ml
       alk : c [meq/ml] = ΔdKH × litros / ml × 0.357                        */
  if(sol.modo==='potencia'){
    const d=+sol.refDelta||0, m=+sol.refMl||0, L=+sol.refLitros||0;
    if(!(d>0&&m>0&&L>0)) return null;
    const porMl = d*L/m;
    return sol.tipo==='alk'
      ? { tipo:'alk', sal:null, c:porMl*DKH_MEQ }
      : { tipo:sol.tipo, sal:null, c:porMl };
  }

  const sal = salPorId(sol.saltId); if(!sal) return null;
  const g = +sol.gramos||0, ml = +sol.volumenMl||0;
  if(!ml) return null;
  return { tipo:tipoDeSal(sal), sal, c:(g*aporteDe(sal))/ml };
}
/* Δ dKH = (ml × C_alk)/(V_neto × 0.357)   ·   Δ ppm = (ml × C_ion)/V_neto */
function efectoPorMl(sol){
  const k = concentracion(sol); if(!k) return null;
  return k.tipo==='alk'
    ? { tipo:'alk', delta:k.c/(V()*DKH_MEQ), unidad:'dKH' }
    : { tipo:k.tipo, delta:k.c/V(),          unidad:'ppm' };
}
function efectoDeDosis(sol, ml){ const e=efectoPorMl(sol); return e ? e.delta*ml : 0; }
/* ml_necesarios = (Δ_dKH × 0.357 × V)/C_alk   ·   (Δ_ppm × V)/C_ion */
function mlPara(sol, delta){
  const e = efectoPorMl(sol);
  return (e && e.delta>0) ? delta/e.delta : null;
}
/* Corrección puntual en seco: gramos = (Δ_ppm × V)/mg_por_gramo */
function gramosEnSeco(sal, deltaPpm){ return (deltaPpm*V())/aporteDe(sal); }

/* Reparto de magnesio entre las dos sales, en masa (§10).
   Solo cloruro desbalancea la proporción iónica; por eso se mezcla con sulfato. */
function repartoMg(deltaPpm, ratio){
  const r = Math.min(6, Math.max(4, +ratio || S.settings.mgRatio || 4.4));
  const cl = S.salts.find(s=>s.compuesto==='mgcl2');
  const so = S.salts.find(s=>s.compuesto==='mgso4');
  if(!cl||!so) return null;
  const apCl = aporteDe(cl), apSo = aporteDe(so);
  const totalMg = deltaPpm * V();                 /* mg de Mg necesarios */
  const gSo = totalMg/(r*apCl + apSo);
  return { ratio:r, cl, so, gCl:r*gSo, gSo, totalMg,
           formaCl:formaDe(cl), formaSo:formaDe(so) };
}

/* ── normalización por salinidad (§5) ── */
function normalizar(valor, salMedida){
  if(valor==null || isNaN(valor)) return null;
  if(!salMedida || salMedida<=0) return +valor;
  return valor * (35/salMedida);
}
/* Devuelve {crudo, norm, salUsada} para un parámetro iónico de una medición */
function leer(test, k){
  if(!test) return null;
  const raw = test.v[k];
  if(raw==null||raw==='') return null;
  const sal = test.v.sal;
  const ion = P[k]?.ion;
  return { crudo:+raw, norm: ion ? normalizar(+raw, sal) : +raw, sal, normalizado: ion && sal>0 && Math.abs(sal-35)>0.05 };
}
const ultimaMedicion = ()=> sortedTests()[0] || null;
/* Último valor normalizado disponible de un parámetro (puede venir de una medición parcial) */
function ultimoNorm(k){
  for(const t of sortedTests()){
    const r = leer(t,k);
    if(r) return {...r, date:t.date};
  }
  return null;
}

/* ── consumo real (§5) ──
   consumo_dKH/día = (Σ efecto_dosis_dKH / días) − (KH_final − KH_inicial)/días  */
function consumo(){
  const ts = sortedTests().filter(t=>t.v.kh!=null && t.v.kh!=='');
  if(ts.length<2) return null;
  const a=ts[0], b=ts[1];
  const dias=(dOf(a.date)-dOf(b.date))/864e5;
  if(dias<=0) return null;

  let dosisDkh=0, huboDosis=false;
  for(const d of S.doses){
    if(d.date>b.date && d.date<=a.date){
      const sol=S.solutions.find(s=>s.id===d.solutionId); if(!sol) continue;
      const e=efectoPorMl(sol);
      if(e && e.tipo==='alk'){ dosisDkh += e.delta*(+d.ml||0); huboDosis=true; }
    }
  }
  const khA=leer(a,'kh').norm, khB=leer(b,'kh').norm;
  const dkh = dosisDkh/dias - (khA-khB)/dias;
  return { dkh, ca:dkh*ACOPLE, dias, desde:b.date, hasta:a.date,
           dosisDkh, huboDosis, khA, khB };
}

/* ── soluciones en uso ── */
function solucionDe(tipo){
  const cands = S.solutions.filter(s=>{
    const k=concentracion(s); return k && k.tipo===tipo && (+s.restanteMl||0)>0;
  });
  if(!cands.length){
    const todas = S.solutions.filter(s=>{ const k=concentracion(s); return k && k.tipo===tipo; });
    return todas.sort((x,y)=> x.fecha<y.fecha?1:-1)[0] || null;
  }
  return cands.sort((x,y)=> x.fecha<y.fecha?1:-1)[0];
}
/* Ritmo sostenido de ml/día por solución: solo el mantenimiento.
   Las correcciones puntuales duran unos días, así que meterlas aquí
   dispararía la autonomía a cifras irreales. */
function mlDiarios(sol){
  const pl = plan();
  if(!pl) return 0;
  let ml=0;
  if(pl.mant.A && pl.mant.A.sol?.id===sol.id) ml+=pl.mant.A.ml;
  if(pl.mant.B && pl.mant.B.sol?.id===sol.id) ml+=pl.mant.B.ml;
  return ml;
}
/* ml que se llevará la corrección pendiente completa, para restarlos aparte */
function mlCorreccion(sol){
  const pl = plan();
  if(!pl) return 0;
  return pl.correcciones.reduce((a,c)=> a + (c.sol?.id===sol.id ? (c.mlDia||0)*(c.dias||0) : 0), 0);
}
function autonomia(sol){
  const ml = mlDiarios(sol);
  const corr = mlCorreccion(sol);
  const rest = +sol.restanteMl||0;
  if(ml<=0) return {dias:null, ml, corr};
  return {dias: Math.floor(Math.max(0, rest-corr)/ml), ml, corr};
}

/* ═══════════════ plan de dosificación (§7.3) ═══════════════ */
function plan(){
  const t = ultimaMedicion();
  if(!t) return null;
  const obj = S.settings.objetivos;
  const cons = consumo();
  const solA = solucionDe('alk'), solB = solucionDe('ca'), solMg = solucionDe('mg');

  /* ── mantenimiento: iguala el consumo medido ── */
  const mant = {A:null, B:null};
  if(cons && cons.dkh>0){
    if(solA){ const ml=mlPara(solA, cons.dkh); if(ml!=null) mant.A={sol:solA, ml, delta:cons.dkh, unidad:'dKH'}; }
    if(solB){ const ml=mlPara(solB, cons.ca);  if(ml!=null) mant.B={sol:solB, ml, delta:cons.ca,  unidad:'ppm'}; }
  }

  /* ── correcciones puntuales, repartidas respetando los límites (§6) ── */
  const correcciones=[];
  const mgL = leer(t,'mg'), khL = leer(t,'kh'), caL = leer(t,'ca');

  /* Magnesio primero: si está bajo, el resto no se sostiene */
  if(mgL && mgL.norm < obj.mg){
    const gap = obj.mg - mgL.norm;
    if(gap >= 10){
      const dias = Math.max(1, Math.ceil(gap/LIM.mg.rec));
      const porDia = gap/dias;
      correcciones.push({
        k:'mg', prioridad:1, de:mgL.norm, a:obj.mg, gap, dias, porDia,
        sol: solMg, mlDia: solMg ? mlPara(solMg, porDia) : null,
        seco: solMg ? null : repartoMg(porDia),
        limite: LIM.mg, repartido: dias>1,
      });
    }
  }
  if(khL && Math.abs(khL.norm-obj.kh) >= 0.15){
    const gap = obj.kh - khL.norm;
    if(gap>0){
      const dias = Math.max(1, Math.ceil(gap/LIM.kh.rec));
      const porDia = gap/dias;
      correcciones.push({
        k:'kh', prioridad:2, de:khL.norm, a:obj.kh, gap, dias, porDia,
        sol: solA, mlDia: solA ? mlPara(solA, porDia) : null,
        limite: LIM.kh, repartido: dias>1,
      });
    } else {
      correcciones.push({k:'kh', prioridad:2, de:khL.norm, a:obj.kh, gap, bajar:true});
    }
  }
  if(caL && caL.norm < obj.ca - 10){
    const gap = obj.ca - caL.norm;
    const dias = Math.max(1, Math.ceil(gap/LIM.ca.rec));
    const porDia = gap/dias;
    correcciones.push({
      k:'ca', prioridad:3, de:caL.norm, a:obj.ca, gap, dias, porDia,
      sol: solB, mlDia: solB ? mlPara(solB, porDia) : null,
      seco: solB ? null : (()=>{ const s=S.salts.find(x=>x.compuesto==='cacl2');
        return s ? {sal:s, g:gramosEnSeco(s,porDia), forma:formaDe(s)} : null; })(),
      limite: LIM.ca, repartido: dias>1,
    });
  }
  correcciones.sort((a,b)=>a.prioridad-b.prioridad);

  /* ── horario: A y B nunca juntas (§6.1) ── */
  const hA=S.settings.horaA, hB=S.settings.horaB, hMg=S.settings.horaMg;
  const sep = separacionHoras(hA,hB);

  return { fecha:t.date, medicion:t, cons, mant, correcciones,
           solA, solB, solMg, horas:{A:hA,B:hB,Mg:hMg}, separacion:sep, obj };
}
function separacionHoras(a,b){
  const m = s=>{ const [h,mi]=String(s||'0:0').split(':').map(Number); return h*60+(mi||0); };
  const d = Math.abs(m(a)-m(b));
  return Math.min(d, 1440-d)/60;
}

/* ═══════════════ avisos y reglas de seguridad (§6) ═══════════════ */
function avisos(){
  const av=[];
  const push=(sev,t,d)=>av.push({sev,t,d});
  const t = ultimaMedicion();

  if(!S.tests.length){
    push('warn','Sin mediciones','Registra una medición para que la app pueda calcular consumo y plan.');
  }

  /* volumen neto sospechoso */
  const vb=+S.settings.volumenBruto||0, vn=+S.settings.volumenNeto||0;
  if(vb>0 && vn>0){
    const r=vn/vb;
    if(r>0.9) push('warn','Volumen neto muy cercano al bruto',
      `Tienes ${vn} L netos sobre ${vb} L brutos (${Math.round(r*100)} %). La roca, la arena y el equipo suelen dejar el neto en 75–85 % del bruto. Si el neto está inflado, todas las dosis salen sobreestimadas.`);
  }

  if(t){
    const dias=daysSince(t.date);
    if(dias>=S.settings.alertaDias)
      push('warn',`Medición atrasada · ${dias} d`, `La última fue el ${fmtDate(t.date)}.`);

    /* salinidad fuera de 34–36 (§5) */
    const sal=t.v.sal;
    if(sal!=null && sal!==''){
      if(sal<34 || sal>36)
        push('bad', `Salinidad en ${fmt(sal,1)} ppt`,
          `Con la salinidad en ${fmt(sal,1)} ppt, todos tus iones van a leer proporcionalmente ${sal<35?'bajos':'altos'}. Corrige la salinidad antes de dosificar: subirla o bajarla arregla varios parámetros de golpe. Ajusta muy despacio, no más de 0.5 ppt por día. Recuerda calibrar el refractómetro con solución estándar de 35 ppt, nunca con agua destilada: es la causa más común de salinidad crónicamente baja.`);
    }

    /* magnesio primero (§6.2) */
    const mg=leer(t,'mg');
    if(mg && mg.norm<1250)
      push('bad','Magnesio bajo · corrígelo primero',
        `${Math.round(mg.norm)} ppm normalizados. Con el magnesio bajo, el carbonato de calcio precipita solo sobre calentadores, bombas y arena en lugar de terminar en los corales. Eso consume calcio y alcalinidad a la vez, y hace que dosificar más solo alimente más precipitación. Corrige el magnesio antes de ajustar los otros dos.`);

    /* desacoplamiento Ca/KH (§6.3) */
    const des=desacoplamiento();
    if(des)
      push('bad','El calcio cae y la alcalinidad no',
        `El calcio bajó ${Math.round(des.caDelta)} ppm en las últimas ${des.n} mediciones mientras la alcalinidad se movió solo ${fmt(Math.abs(des.khDelta),2)} dKH. Eso es la firma de dosificar una sola de las dos partes: revisa que la Parte B esté saliendo y que el bidón no esté vacío.`);

    /* alcalinidad alta con nutrientes bajos (§6.4) */
    const kh=leer(t,'kh'), no3=t.v.no3, po4=t.v.po4;
    const nutriBajo = (no3!=null&&no3!==''&&no3<2) || (po4!=null&&po4!==''&&po4<0.02);
    if(kh && kh.norm>9 && nutriBajo)
      push('bad','Alcalinidad alta con nutrientes bajos',
        `${fmt(kh.norm,2)} dKH con los nutrientes por el suelo. Con nutrientes muy bajos, una alcalinidad alta quema puntas de coral en lugar de acelerar el crecimiento. Baja la alcalinidad hacia 7.5–8 o sube nitratos y fosfatos primero.`);

    /* nutrientes en cero (§6.5) */
    const cero=[];
    if(no3!=null&&no3!==''&&+no3===0) cero.push('nitratos');
    if(po4!=null&&po4!==''&&+po4===0) cero.push('fosfatos');
    if(cero.length)
      push('warn',`${cero.join(' y ')} en cero`,
        `Si el crecimiento está estancado, puede ser falta de nitrógeno y fósforo, no de parámetros minerales. Los corales necesitan algo de ambos: alimenta más o dosifica nitrato y fosfato hasta entrar en rango.`);

    /* parámetros fuera de rango */
    for(const p of PARAMS){
      const r=leer(t,p.k); if(!r) continue;
      const st=status(p.k, r.norm); if(st==='ok') continue;
      if(p.k==='sal') continue;   /* ya avisado arriba */
      const {min,max}=tgt(p.k);
      push(st==='bad'?'bad':'warn', `${p.n} ${fmt(r.norm,p.dec)} ${p.u}`.trim(),
        `Fuera del rango ${fmt(min,p.dec)}–${fmt(max,p.dec)}${r.normalizado?` (normalizado; medido ${fmt(r.crudo,p.dec)})`:''}. ${consejo(p.k, r.norm)}`);
    }
  }

  /* hidratos sin confirmar (§4) */
  const inciertas = S.salts.filter(s=>hidratoIncierto(s) && seUsa(s));
  if(inciertas.length)
    push('warn', `${inciertas.length} ${plural(inciertas.length,'sal sin confirmar','sales sin confirmar')}`,
      `${inciertas.map(s=>compuestoDe(s).n).join(', ')}. La app está calculando con la forma anhidra, la más concentrada, para que te quedes corto en vez de pasarte. Confírmalo en Soluciones para afinar la receta.`);

  /* grado industrial sin CoA (§4) */
  const sinCoa = S.salts.filter(s=>s.grado==='tecnico' && !s.coa && seUsa(s));
  if(sinCoa.length)
    push('warn','Sal de grado industrial sin certificado',
      `${sinCoa.map(s=>compuestoDe(s).n).join(', ')}. El grado industrial puede traer metales pesados que los corales acusan en partes por billón, muy por debajo de lo que regula el grado alimenticio. El cloruro de calcio es el más variable porque sale de salmueras naturales. Pide el certificado de análisis o cambia a grado alimenticio.`);

  /* autonomía de soluciones (§7.2) */
  for(const sol of S.solutions){
    const a=autonomia(sol);
    if(a.dias!=null && a.dias<14)
      push(a.dias<=3?'bad':'warn', `${sol.nombre}: quedan ${a.dias} ${plural(a.dias,'día','días')}`,
        `Al ritmo actual de ${fmt(a.ml,1)} ml/día te quedan ${Math.round(sol.restanteMl)} ml. Prepara el siguiente bidón antes de que se acabe.`);
  }

  /* renovación de agua (§7.6) */
  const ren=renovacion();
  if(ren.mes!=null && ren.mes<5 && S.maint.some(m=>m.tipo==='cambio'))
    push('warn','Renovación por debajo del 5 % mensual',
      `Llevas ${fmt(ren.mes,1)} % en 30 días. El Balling de dos partes deja atrás sodio y cloruro que se acumulan poco a poco. Sube a 10 % semanal o considera Balling Light con sal sin NaCl.`);

  if(!av.length) push('ok','Todo en orden','Los parámetros están en rango y no hay nada pendiente.');
  return av;
}
function seUsa(sal){
  return S.solutions.some(s=>s.saltId===sal.id) || sal.enUso ||
         ['cacl2','mgcl2','mgso4','nahco3'].includes(sal.compuesto);
}
function desacoplamiento(){
  const ts = sortedTests().filter(t=>t.v.ca!=null&&t.v.ca!==''&&t.v.kh!=null&&t.v.kh!=='').slice(0,4);
  if(ts.length<3) return null;
  const ca = ts.map(t=>leer(t,'ca').norm), kh = ts.map(t=>leer(t,'kh').norm);
  const caDelta = ca[0]-ca[ca.length-1];       /* negativo si bajó en el tiempo */
  const khDelta = kh[0]-kh[kh.length-1];
  /* ts va del más NUEVO al más viejo: que el calcio baje con el tiempo significa
     que, recorriendo el array, cada valor es mayor o igual que el anterior. */
  const bajaMonotona = ca.every((v,i)=> i===0 || v>=ca[i-1]-2);
  if(caDelta < -15 && Math.abs(khDelta) < 0.4 && bajaMonotona)
    return {caDelta, khDelta, n:ts.length};
  return null;
}
function renovacion(){
  const vol=V();
  const suma = d => S.maint.filter(m=>m.tipo==='cambio' && daysSince(m.date)<=d)
                          .reduce((a,m)=>a+(+m.cant||0),0);
  const l7=suma(7), l30=suma(30);
  return { semana: vol?l7/vol*100:null, mes: vol?l30/vol*100:null, l7, l30 };
}
function consejo(k,v){
  const {min}=tgt(k), bajo=v<min;
  return {
    kh:  bajo?'Súbela con la Parte A, máximo 0.5 dKH al día.':'Suspende la Parte A y deja que el consumo la baje sola.',
    ca:  bajo?'Súbelo con la Parte B, máximo 50 ppm al día.':'Suspende la Parte B y verifica el kit.',
    mg:  bajo?'Corrígelo con la mezcla de cloruro y sulfato, máximo 50 ppm al día.':'Baja solo con cambios de agua; no hay prisa.',
    no3: bajo?'Alimenta más o dosifica nitrato hasta 5 ppm.':'Sube el cambio de agua o la marcha del skimmer.',
    po4: bajo?'Reduce el absorbente: el fosfato en cero causa palidez y STN.':'Usa GFO y revisa el exceso de comida.',
    temp:bajo?'Revisa el calentador.':'Sube los ventiladores o baja la potencia de las luces.',
    ph:  bajo?'Mejora la aireación; casi siempre es exceso de CO₂ en la casa.':'Suele bajar solo; no dosifiques buffer por esto.',
    sal: bajo?'Repón con agua salada, no con osmosis. Máximo 0.5 ppt al día.':'Rellena con osmosis pura. Máximo 0.5 ppt al día.',
  }[k] || '';
}

/* ═══════════════ autoverificación (§9) ═══════════════ */
function autotests(){
  const Vt = 175;
  const dkh = (g,ml,dose,meq)=>{ const c=(g*meq)/ml; return (dose*c)/(Vt*DKH_MEQ); };
  const ppm = (g,ml,dose,mgg)=>{ const c=(g*mgg)/ml; return (dose*c)/Vt; };
  const A = COMPUESTOS;
  const c1 = dkh(400,5000,30, A.nahco3.formas.anhidro.ap);
  const c2 = ppm(350,5000,30, A.cacl2.formas.hidratado.ap);
  const c4 = ppm(265,5000,30, A.cacl2.formas.anhidro.ap);
  const c5 = (110*A.mgcl2.formas.hidratado.ap + 25*A.mgso4.formas.hidratado.ap)/Vt;
  const c6 = (1*Vt)/A.cacl2.formas.hidratado.ap;
  const c7 = (1*Vt)/A.mgcl2.formas.hidratado.ap;
  const c8 = 1230*35/33;
  const casos = [
    {n:1, e:'400 g NaHCO₃ en 5000 ml, dosis 30 ml', esp:0.457, obt:c1, u:'dKH', tol:0.002},
    {n:2, e:'350 g CaCl₂·2H₂O en 5000 ml, dosis 30 ml', esp:3.27, obt:c2, u:'ppm Ca', tol:0.01},
    {n:3, e:'Acoplamiento entre los casos 1 y 2', esp:7.15, obt:c2/c1, u:'ppm/dKH', tol:0.01},
    {n:4, e:'265 g CaCl₂ anhidro en 5000 ml, dosis 30 ml', esp:3.27, obt:c4, u:'ppm Ca', tol:0.02,
     nota:'265 g es el redondeo del equivalente exacto (264.2 g), de ahí las centésimas'},
    {n:5, e:'110 g MgCl₂·6H₂O + 25 g MgSO₄·7H₂O en seco', esp:89.2, obt:c5, u:'ppm Mg', tol:0.1},
    {n:6, e:'Subir 1 ppm de Ca con CaCl₂·2H₂O', esp:0.642, obt:c6, u:'g', tol:0.001},
    {n:7, e:'Subir 1 ppm de Mg con MgCl₂·6H₂O', esp:1.463, obt:c7, u:'g', tol:0.001},
    {n:8, e:'Mg 1230 medido con salinidad 33 ppt', esp:1305, obt:c8, u:'ppm', tol:1},
  ];
  return casos.map(c=>({...c, ok: Math.abs(c.obt-c.esp) <= c.tol}));
}
