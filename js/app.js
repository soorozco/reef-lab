/* ═══════════════════════════════════════════════════════════════════════
   app.js — modal, navegación, eventos y arranque.
   ═══════════════════════════════════════════════════════════════════════ */

/* parámetro sintético para la gráfica de crecimiento de un coral */
P['__talla']={k:'__talla', n:'Talla', ab:'Talla', u:'cm', min:0, max:0, dec:1, step:.1};

/* ───────── modal ───────── */
let onOk=null;
function openModal(title, html, ok, cls=''){
  onOk=ok;
  $('#modal').className='dialog '+cls;
  $('#modal').innerHTML=`
    <div class="dialog-h"><h3>${esc(title)}</h3><button class="x" data-close>✕</button></div>
    <div class="dialog-b">${html}</div>
    ${ok?`<div class="dialog-f"><button class="btn" data-close>CANCELAR</button><button class="btn btn-primary" id="okBtn">GUARDAR</button></div>`:''}`;
  $('#backdrop').classList.add('on');
  document.body.style.overflow='hidden';
  if(ok) $('#okBtn').onclick=()=>onOk();
}
function closeModal(){ $('#backdrop').classList.remove('on'); document.body.style.overflow=''; onOk=null; }

/* ───────── respaldo ─────────
   Exporta los datos, no las imágenes: las fotos viven en Supabase Storage
   y en el JSON solo van sus rutas. */
async function exportData(){
  const out = structuredClone(S);
  out._meta = {app:'reeflab', version:2, exportado:today(), fotos:'en Supabase Storage'};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));
  a.download=`reeflab-${today()}.json`; a.click();
  URL.revokeObjectURL(a.href);
  toast('Respaldo descargado');
}
async function importData(e){
  const f=e.target.files[0]; if(!f) return;
  try{
    const d=JSON.parse(await f.text());
    if(!d.tests && !d.solutions && !d.corals) throw new Error('formato');
    if(!confirm('Esto reemplazará en la nube todos los datos de tu cuenta. ¿Continuar?')) return;
    delete d._meta; delete d._fotos;
    S = {
      settings: Object.assign({}, DEFAULTS.settings, d.settings||{},
                 {objetivos: Object.assign({}, DEFAULTS.settings.objetivos, (d.settings||{}).objetivos||{})}),
      salts:     d.salts?.length ? d.salts : salesPorDefecto(),
      solutions: d.solutions||[], tests: d.tests||[], doses: d.doses||[],
      maint:     d.maint||[],     corals: d.corals||[],
    };
    save(); renderAll(); toast('Respaldo importado y sincronizado');
  }catch(err){ toast('Archivo no válido'); }
  e.target.value='';
}

/* ───────── navegación ───────── */
const ACCIONES = {
  panel:    ()=>'<button class="btn btn-primary" data-quick="test">+ MEDICIÓN</button>',
  plan:     ()=>'<button class="btn btn-primary" data-quick="dosis">+ DOSIS</button>',
  parametros:()=>'<button class="btn btn-primary" data-quick="test">+ MEDICIÓN</button>',
  soluciones:()=>'<button class="btn btn-primary" data-quick="sol">+ SOLUCIÓN</button>',
  corales:  ()=>'<button class="btn btn-primary" data-quick="coral">+ CORAL</button>',
  mant:     ()=>'<button class="btn btn-primary" data-quick="mant">+ REGISTRAR</button>',
  calc:     ()=>`<span class="meta">Volumen neto ${S.settings.volumenNeto} L</span>`,
  ajustes:  ()=>'<span class="meta">Guardado automático</span>',
};
let curTab='panel';
function setNavAction(){ $('#navAction').innerHTML = (ACCIONES[curTab]||(()=>''))(); }
function renderAll(){
  renderPanel(); renderPlan(); renderParametros(); renderSoluciones();
  renderCorales(); renderMant(); renderAjustes();
  if(curTab==='calc') renderCalc();
  setNavAction();
}
function goTab(t){
  curTab=t;
  $$('#tabs button').forEach(b=>b.classList.toggle('on', b.dataset.tab===t));
  $$('.view').forEach(v=>v.classList.toggle('on', v.id==='v-'+t));
  if(t==='calc') renderCalc();
  setNavAction();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ───────── eventos ───────── */
document.addEventListener('click', async e=>{
  const t=e.target.closest('[data-tab],[data-tabgo],[data-quick],[data-export],[data-ck],[data-cd],[data-cmodo],[data-cf],[data-mf],[data-coral],[data-coraledit],[data-coraldel],[data-logadd],[data-logdel],[data-edit-test],[data-del-test],[data-del-mant],[data-del-dosis],[data-prep],[data-soledit],[data-soldel],[data-rellenar],[data-saledit],[data-close]');
  if(!t) return;
  const d=t.dataset;
  if(d.tab) return goTab(d.tab);
  if(d.tabgo) return goTab(d.tabgo);
  if(d.close!==undefined) return closeModal();
  if(d.export!==undefined) return exportData();

  if(d.quick==='test')  return testForm();
  if(d.quick==='coral') return coralForm();
  if(d.quick==='mant')  return mantForm();
  if(d.quick==='sol')   return solucionForm();
  if(d.quick==='dosis') return dosisForm();

  if(d.cmodo){ chartModo=d.cmodo; return renderParametros(); }
  if(d.ck){ chartK=d.ck; chartModo='uno'; return renderParametros(); }
  if(d.cd!==undefined && d.cd!==''){ chartD=+d.cd; return renderParametros(); }
  if(d.cf){ coralFilter=d.cf; return renderCorales(); }
  if(d.mf){ mantFilter=d.mf; return renderMant(); }

  if(d.prep)      return prepararModal(d.prep);
  if(d.rellenar)  return rellenarSolucion(d.rellenar);
  if(d.soledit)   return solucionForm(d.soledit);
  if(d.saledit)   return salForm(d.saledit);
  if(d.soldel){
    const s=S.solutions.find(x=>x.id===d.soldel);
    if(!confirm(`¿Eliminar "${s.nombre}"? Las dosis registradas se conservan.`)) return;
    S.solutions=S.solutions.filter(x=>x.id!==d.soldel);
    save(); renderAll(); return toast('Solución eliminada');
  }

  if(d.coral) return coralDetail(d.coral);
  if(d.coraledit){ closeModal(); return setTimeout(()=>coralForm(d.coraledit),60); }
  if(d.coraldel){
    const c=S.corals.find(x=>x.id===d.coraldel);
    if(!confirm(`¿Eliminar "${c.nombre}" y toda su bitácora?`)) return;
    if(c.photo) Photos.del(c.photo);
    (c.log||[]).forEach(l=>l.photo&&Photos.del(l.photo));
    S.corals=S.corals.filter(x=>x.id!==d.coraldel);
    save(); closeModal(); renderAll(); return toast('Coral eliminado');
  }
  if(d.logadd){ const id=d.logadd; closeModal(); return setTimeout(()=>logForm(id),60); }
  if(d.logdel){
    const [cid,lid]=d.logdel.split(':');
    const c=S.corals.find(x=>x.id===cid), l=c.log.find(x=>x.id===lid);
    if(!confirm('¿Eliminar este registro?')) return;
    if(l.photo) Photos.del(l.photo);
    c.log=c.log.filter(x=>x.id!==lid);
    save(); renderAll(); closeModal(); return setTimeout(()=>coralDetail(cid),60);
  }

  if(d.editTest) return testForm(d.editTest);
  if(d.delTest){
    if(!confirm('¿Eliminar esta medición?')) return;
    S.tests=S.tests.filter(x=>x.id!==d.delTest); save(); renderAll(); return toast('Medición eliminada');
  }
  if(d.delMant){
    if(!confirm('¿Eliminar este registro?')) return;
    S.maint=S.maint.filter(x=>x.id!==d.delMant); save(); renderAll(); return toast('Registro eliminado');
  }
  if(d.delDosis){
    if(!confirm('¿Eliminar esta dosis? El consumo se recalcula sin ella.')) return;
    const ds=S.doses.find(x=>x.id===d.delDosis);
    const sol=ds && S.solutions.find(s=>s.id===ds.solutionId);
    if(sol) sol.restanteMl=Math.min(sol.volumenMl,(+sol.restanteMl||0)+(+ds.ml||0));
    S.doses=S.doses.filter(x=>x.id!==d.delDosis);
    save(); renderAll(); return toast('Dosis eliminada');
  }
});
$('#backdrop').addEventListener('click', e=>{ if(e.target.id==='backdrop') closeModal(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

/* La app no pinta nada hasta que hay sesión y datos cargados desde Supabase. */
arrancar();
