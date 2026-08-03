/* ═══════════════════════════════════════════════════════════════════════
   graficas.js — SVG a mano, sin librerías. Estética Modernist.
   ═══════════════════════════════════════════════════════════════════════ */

const INK='#201e1d', ACC='#ec3013', GRIS='#7d7979', BANDA='rgba(32,30,29,.10)', REJ='rgba(32,30,29,.18)';

function sparkline(pts, k){
  if(pts.length<2) return `<svg viewBox="0 0 100 30" preserveAspectRatio="none"></svg>`;
  const W=100,H=30, xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
  const {min:tmin,max:tmax}=tgt(k);
  const lo=Math.min(...ys,tmin), hi=Math.max(...ys,tmax), span=(hi-lo)||1;
  const x0=Math.min(...xs), x1=Math.max(...xs), xs2=(x1-x0)||1;
  const X=p=>((p.x-x0)/xs2)*W, Y=p=>H-4-((p.y-lo)/span)*(H-8);
  const d=pts.map((p,i)=>`${i?'L':'M'}${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join('');
  const bT=H-4-((tmax-lo)/span)*(H-8), bB=H-4-((tmin-lo)/span)*(H-8);
  const off=isOff(status(k, ys[ys.length-1]));
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <rect x="0" y="${Math.max(0,bT).toFixed(1)}" width="${W}" height="${Math.max(1,bB-bT).toFixed(1)}" fill="${INK}" opacity=".08"></rect>
    <path d="${d}" fill="none" stroke="${off?ACC:INK}" stroke-width="2" vector-effect="non-scaling-stroke"></path>
  </svg>`;
}

/* marcas de la línea de tiempo: cambios de agua y correcciones puntuales */
function eventosEntre(x0,x1){
  const ev=[];
  for(const m of S.maint){
    if(m.tipo!=='cambio') continue;
    const x=dOf(m.date).getTime();
    if(x>=x0&&x<=x1) ev.push({x, tipo:'agua', txt:`Cambio de agua · ${m.cant||'?'} L · ${fmtDate(m.date)}`});
  }
  for(const d of S.doses){
    if(!d.correccion) continue;
    const x=dOf(d.date).getTime();
    if(x>=x0&&x<=x1) ev.push({x, tipo:'corr', txt:`Corrección · ${fmt(d.ml,0)} ml · ${fmtDate(d.date)}`});
  }
  return ev;
}

function bigChart(pts, k, opts={}){
  const band=!opts.noBand, p=P[k]||{n:opts.nombre||'', u:opts.unidad||'', dec:opts.dec??2};
  if(!pts.length) return `<div class="empty">Sin datos de ${esc(p.n)} en este periodo</div>`;
  const {min:tmin,max:tmax} = band ? tgt(k) : {min:null,max:null};
  const W=1180,H=230,L=60,R=20,T=20,AX=190,BASE=200, iw=W-L-R, ih=AX-T;
  const ys=pts.map(q=>q.y), xs=pts.map(q=>q.x);
  let lo=Math.min(...ys, band?tmin:Infinity), hi=Math.max(...ys, band?tmax:-Infinity);
  const pad=((hi-lo)||Math.max(Math.abs(hi)*.1,.1))*0.12; lo-=pad; hi+=pad;
  const span=(hi-lo)||1, x0=Math.min(...xs), x1=Math.max(...xs), xspan=(x1-x0)||864e5;
  const X=v=>L+((v-x0)/xspan)*iw, Y=v=>T+ih-((v-lo)/span)*ih;
  const line=pts.map((q,i)=>`${i?'L':'M'}${X(q.x).toFixed(1)},${Y(q.y).toFixed(1)}`).join('');
  const ticks=Array.from({length:5},(_,i)=> hi-span*i/4);
  const grid=ticks.map(v=>`<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W-R}" y2="${Y(v).toFixed(1)}"></line>`).join('');
  const ylab=ticks.map(v=>`<text x="0" y="${(Y(v)+4).toFixed(1)}">${fmt(v,p.dec)}</text>`).join('');
  const nX=Math.min(6,pts.length);
  const xlab=Array.from({length:nX},(_,i)=>{
    const q=pts[Math.round(i*(pts.length-1)/Math.max(1,nX-1))];
    const an=i===0?'start':i===nX-1?'end':'middle';
    return `<text x="${X(q.x).toFixed(1)}" y="220" text-anchor="${an}">${fmtShort(q.date).toUpperCase()}</text>`;
  }).join('');
  const marcas = opts.eventos===false ? '' : eventosEntre(x0,x1).map(e=>{
    const x=X(e.x).toFixed(1);
    const col = e.tipo==='agua' ? GRIS : ACC;
    return `<line x1="${x}" y1="${T}" x2="${x}" y2="${BASE}" stroke="${col}" stroke-width="1" stroke-dasharray="3 3" opacity=".7"><title>${esc(e.txt)}</title></line>
      <polygon points="${x-4},${BASE+1} ${+x+4},${BASE+1} ${x},${BASE-5}" fill="${col}" opacity=".8"><title>${esc(e.txt)}</title></polygon>`;
  }).join('');
  const dots=pts.slice(0,-1).map(q=>`<circle cx="${X(q.x).toFixed(1)}" cy="${Y(q.y).toFixed(1)}" r="3.5"><title>${fmtDate(q.date)} · ${fmt(q.y,p.dec)} ${p.u}</title></circle>`).join('');
  const last=pts[pts.length-1], lx=X(last.x), ly=Y(last.y);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" font-family="Archivo, system-ui, sans-serif">
    ${band?`<rect x="${L}" y="${Y(tmax).toFixed(1)}" width="${iw}" height="${Math.max(1,Y(tmin)-Y(tmax)).toFixed(1)}" fill="${BANDA}"></rect>`:''}
    <g stroke="${REJ}" stroke-width="1">${grid}</g>
    <g font-size="11" font-weight="600" fill="${GRIS}">${ylab}</g>
    ${marcas}
    <line x1="${L}" y1="${BASE}" x2="${W-R}" y2="${BASE}" stroke="${INK}" stroke-width="2"></line>
    <g font-size="11" font-weight="600" fill="${GRIS}">${xlab}</g>
    <path d="${line}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"></path>
    <g fill="#f3f2f2" stroke="${INK}" stroke-width="2">${dots}</g>
    <line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${BASE}" stroke="${ACC}" stroke-width="2"></line>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="5" fill="${ACC}"><title>${fmtDate(last.date)} · ${fmt(last.y,p.dec)} ${p.u}</title></circle>
    <text x="${(lx-10).toFixed(1)}" y="${(ly-12).toFixed(1)}" text-anchor="end" font-size="13" font-weight="800" fill="${ACC}">${fmt(last.y,p.dec)}</text>
  </svg>`;
}

/* ── KH y Ca superpuestos con doble eje escalado 7.15:1 (§7.5) ──
   El eje derecho se ancla en los objetivos: ca_equivalente(v) = objKH + (v−objCa)/7.15.
   Si ambos se consumen acoplados, las dos líneas se mueven juntas.
   Cuando se separan, se está dosificando una sola parte.                    */
function overlayKhCa(dias){
  const A=serieNorm('kh',dias), B=serieNorm('ca',dias);
  if(A.length<2 && B.length<2) return `<div class="empty">Hacen falta al menos dos mediciones con KH y calcio</div>`;
  const obj=S.settings.objetivos;
  const caAdKh = v => obj.kh + (v-obj.ca)/ACOPLE;
  const khACa  = v => obj.ca + (v-obj.kh)*ACOPLE;

  const W=1180,H=250,L=60,R=68,T=20,AX=200,BASE=210, iw=W-L-R, ih=AX-T;
  const eqB = B.map(q=>({...q, y:caAdKh(q.y)}));
  const todosY=[...A.map(q=>q.y), ...eqB.map(q=>q.y), tgt('kh').min, tgt('kh').max];
  let lo=Math.min(...todosY), hi=Math.max(...todosY);
  const pad=((hi-lo)||1)*0.14; lo-=pad; hi+=pad;
  const span=(hi-lo)||1;
  const todosX=[...A,...B].map(q=>q.x);
  const x0=Math.min(...todosX), x1=Math.max(...todosX), xspan=(x1-x0)||864e5;
  const X=v=>L+((v-x0)/xspan)*iw, Y=v=>T+ih-((v-lo)/span)*ih;
  const path=s=>s.map((q,i)=>`${i?'L':'M'}${X(q.x).toFixed(1)},${Y(q.y).toFixed(1)}`).join('');
  const ticks=Array.from({length:5},(_,i)=> hi-span*i/4);
  const grid=ticks.map(v=>`<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W-R}" y2="${Y(v).toFixed(1)}"></line>`).join('');
  const yIzq=ticks.map(v=>`<text x="0" y="${(Y(v)+4).toFixed(1)}">${fmt(v,2)}</text>`).join('');
  const yDer=ticks.map(v=>`<text x="${W-R+10}" y="${(Y(v)+4).toFixed(1)}">${Math.round(khACa(v))}</text>`).join('');
  const {min:tmin,max:tmax}=tgt('kh');
  const nX=Math.min(6, Math.max(A.length,B.length));
  const ref=A.length>=B.length?A:B;
  const xlab=Array.from({length:nX},(_,i)=>{
    const q=ref[Math.round(i*(ref.length-1)/Math.max(1,nX-1))];
    const an=i===0?'start':i===nX-1?'end':'middle';
    return `<text x="${X(q.x).toFixed(1)}" y="230" text-anchor="${an}">${fmtShort(q.date).toUpperCase()}</text>`;
  }).join('');
  const marcas=eventosEntre(x0,x1).map(e=>{
    const x=X(e.x).toFixed(1), col=e.tipo==='agua'?GRIS:ACC;
    return `<line x1="${x}" y1="${T}" x2="${x}" y2="${BASE}" stroke="${col}" stroke-width="1" stroke-dasharray="3 3" opacity=".6"><title>${esc(e.txt)}</title></line>`;
  }).join('');
  const pts=(s,col,fill)=>s.map(q=>`<circle cx="${X(q.x).toFixed(1)}" cy="${Y(q.y).toFixed(1)}" r="3.2" fill="${fill}" stroke="${col}" stroke-width="2"><title>${fmtDate(q.date)}</title></circle>`).join('');

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" font-family="Archivo, system-ui, sans-serif">
    <rect x="${L}" y="${Y(tmax).toFixed(1)}" width="${iw}" height="${Math.max(1,Y(tmin)-Y(tmax)).toFixed(1)}" fill="${BANDA}"></rect>
    <g stroke="${REJ}" stroke-width="1">${grid}</g>
    <g font-size="11" font-weight="600" fill="${GRIS}">${yIzq}</g>
    <g font-size="11" font-weight="600" fill="${ACC}">${yDer}</g>
    ${marcas}
    <line x1="${L}" y1="${BASE}" x2="${W-R}" y2="${BASE}" stroke="${INK}" stroke-width="2"></line>
    <g font-size="11" font-weight="600" fill="${GRIS}">${xlab}</g>
    <path d="${path(A)}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"></path>
    <path d="${path(eqB)}" fill="none" stroke="${ACC}" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="7 4"></path>
    ${pts(A,INK,'#f3f2f2')}${pts(eqB,ACC,'#f3f2f2')}
    <text x="0" y="12" font-size="11" font-weight="800" fill="${INK}">dKH</text>
    <text x="${W-R+10}" y="12" font-size="11" font-weight="800" fill="${ACC}">ppm Ca</text>
  </svg>`;
}
/* serie normalizada a 35 ppt */
function serieNorm(k, dias){
  const cut = dias ? Date.now()-dias*864e5 : 0;
  return S.tests.filter(t=>t.v[k]!=null&&t.v[k]!==''&&dOf(t.date)>=cut)
    .map(t=>({x:dOf(t.date).getTime(), y:leer(t,k).norm, date:t.date}))
    .sort((a,b)=>a.x-b.x);
}
