// OMS-aanvulling demo - runs on real OMS4Business exports (local only).
let ORDERS=[], CONTRACTS=[], LOCS=null;
// Canonical waste-stream list per Dick's spec. `match` = real OMS productgroep string(s).
// NOTE: "Bouw en sloop" (plain) has no exact OMS match - several similar buckets exist
// ("Bouw en sloopafval container", "...sorteerbaar", "...niet sorteerbaar", "...80% puin",
// "...50% recyclebaar"). Mapped to the largest/most generic bucket as a best guess -
// flagged to the client for confirmation, not silently assumed as final.
const WASTE_STREAM_MAP=[
  {label:"Bedrijfsafval", match:["Bedrijfsafval"]},
  {label:"Bouw en sloop licht", match:["Bouw- en sloopafval licht"]},
  {label:"Bouw en sloop", match:["Bouw en sloopafval container"]},
  {label:"Hout B", match:["Hout B"]},
  {label:"Hout C", match:["Hout C"]},
  {label:"Puin", match:["Puin"]},
  {label:"Groen afval", match:["Groenafval"]},
  {label:"Gipsafval", match:["Gipsafval"]},
  {label:"Vlakglas", match:["Vlakglas"]},
  {label:"Flessenglas", match:["Flessenglas"]},
  {label:"Dakleer", match:["Dakleer"]},
  {label:"Papier/Karton", match:["Papier / karton"]},
  {label:"Metaal", match:["Metaal / schroot"]},
  {label:"Bouw en sloop zanderig", match:["Bouw- en sloopafval zanderig"]},
];
const state={fYear:"alle", fPart:"all", fDay:"", statuses:new Set(["Factuur gemaakt"]), locFilter:"alle",
  rapDirection:"in", rapStreams:new Set(WASTE_STREAM_MAP.map(s=>s.label)), rapInternal:false};
const NLM=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const eur=n=>"€ "+Math.round(n||0).toLocaleString("nl-NL");
const ton=n=>(n/1000).toLocaleString("nl-NL",{maximumFractionDigits:1});
const num=n=>(n||0).toLocaleString("nl-NL");

function matchPeriod(o){
  const dt=o.uitvoerdatum||"";
  if(state.fDay) return dt===state.fDay;
  if(!dt) return state.fYear==="alle";
  if(state.fYear==="alle") return true;
  if(dt.slice(0,4)!==state.fYear) return false;
  const mo=+dt.slice(5,7), p=state.fPart;
  if(p==="all") return true;
  if(p==="h1") return mo<=6;
  if(p==="h2") return mo>=7;
  if(p==="q1") return mo<=3;
  if(p==="q2") return mo>=4&&mo<=6;
  if(p==="q3") return mo>=7&&mo<=9;
  if(p==="q4") return mo>=10;
  if(/^\d\d$/.test(p)) return dt.slice(5,7)===p;
  return true;
}
function inPeriod(o){ return matchPeriod(o); }
function matchStatus(o){ return !state.statuses.size || state.statuses.has(o.status); }
function monthKey(o){ return (o.uitvoerdatum||"").slice(0,7); }

// ---- Rapportage (per-waste-stream, statutory-style report) ----
function rapStreamDef(label){ return WASTE_STREAM_MAP.find(s=>s.label===label); }
function rapMatchSet(labels){ const set=new Set(); WASTE_STREAM_MAP.forEach(s=>{ if(labels.has(s.label)) s.match.forEach(m=>set.add(m)); }); return set; }
// direction "out" (Uitgevoerd/afgevoerd naar verwerker) has NO source in OMS order data -
// confirmed via API probe (single administration, no stockSection, only revenue ledgers).
// Never fabricate a number for it; always return an empty set and show an honest note.
function rapRows(labels,direction){
  if(direction==="out") return [];
  const prodSet=rapMatchSet(labels);
  return ORDERS.filter(o=>matchPeriod(o)&&prodSet.has(o.productgroep));
}
function rapStreamLabelText(){
  const n=state.rapStreams.size;
  if(n===0) return "Geen selectie";
  if(n===WASTE_STREAM_MAP.length) return "Alle stromen";
  if(n===1) return [...state.rapStreams][0];
  return n+" stromen";
}
function renderKpis(){
  const inTon=rapRows(state.rapStreams,"in").reduce((s,o)=>s+(o.netto_gewicht||0),0);
  document.getElementById("kpis").innerHTML=[
    ["Ingevoerd",ton(inTon)+'<span class="unit">ton</span>',"in geselecteerde periode"],
    ["Uitgevoerd","n.v.t.","niet vastgelegd in OMS"],
    ["Afvalstroom",rapStreamLabelText(),"geselecteerd"],
  ].map(([l,v,s])=>`<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join("");
}
function renderStreams(){
  document.getElementById("stream-count").textContent=state.rapStreams.size+" van "+WASTE_STREAM_MAP.length+" stromen";
  const internal=state.rapInternal;
  const head=document.getElementById("stream-table-head");
  head.innerHTML="<th>Afvalstroom</th><th>Periode</th><th class=\"num\">Gewicht (ton)</th>"+(internal?"<th class=\"num fin-col\">Orders</th><th class=\"num fin-col\">Omzet (excl)</th>":"");
  const plabel=periodLabel();
  const labels=[...state.rapStreams].sort((a,b)=>WASTE_STREAM_MAP.findIndex(s=>s.label===a)-WASTE_STREAM_MAP.findIndex(s=>s.label===b));
  if(state.rapDirection==="out"){
    document.querySelector("#stream-table tbody").innerHTML=`<tr><td colspan="${internal?5:3}" class="note">Uitgevoerde/afgevoerde hoeveelheden worden momenteel niet vastgelegd in OMS-orders (geen koppeling naar transport/verwerkersafgifte). Dit vraagt een aanvullende databron om hier te kunnen tonen.</td></tr>`;
    return;
  }
  if(!labels.length){
    document.querySelector("#stream-table tbody").innerHTML=`<tr><td colspan="${internal?5:3}" class="note">Selecteer één of meer afvalstromen via de knop hierboven.</td></tr>`;
    return;
  }
  document.querySelector("#stream-table tbody").innerHTML=labels.map(label=>{
    const def=rapStreamDef(label); const prodSet=new Set(def.match);
    const rows=ORDERS.filter(o=>matchPeriod(o)&&prodSet.has(o.productgroep));
    const kg=rows.reduce((s,o)=>s+(o.netto_gewicht||0),0);
    const orders=new Set(rows.map(o=>o.ordernr)).size;
    const omzet=rows.reduce((s,o)=>s+(o.regeltotaal||0),0);
    return `<tr><td>${label}</td><td>${plabel}</td><td class="num">${ton(kg)}</td>${internal?`<td class="num fin-col">${num(orders)}</td><td class="num fin-col">${eur(omzet)}</td>`:""}</tr>`;
  }).join("");
}
function renderDetail(){
  const rows=rapRows(state.rapStreams,"in");
  document.getElementById("detail-title").textContent = "Per maand ("+rapStreamLabelText()+")";
  document.getElementById("detail-sub").textContent = "";
  const byM={};
  rows.forEach(o=>{const m=monthKey(o); if(!m)return; (byM[m]=byM[m]||{kg:0,orders:new Set()}); byM[m].kg+=(o.netto_gewicht||0); byM[m].orders.add(o.ordernr);});
  const months=Object.keys(byM).sort();
  const maxKg=Math.max(1,...months.map(m=>byM[m].kg));
  document.getElementById("detail-months").innerHTML = months.length? months.map(m=>{
    const [y,mm]=m.split("-"); const lbl=`${NLM[+mm-1]} ${y}`;
    return `<div class="month-row"><div class="m">${lbl}</div><div class="b"><span style="width:${byM[m].kg/maxKg*100}%"></span></div><div class="v">${ton(byM[m].kg)} ton &middot; ${byM[m].orders.size} ord.</div></div>`;
  }).join("") : `<div class="note">Geen gewogen orders in deze selectie.</div>`;
  const byC={};
  rows.forEach(o=>{const c=o.relatie||"(onbekend)"; (byC[c]=byC[c]||{omzet:0,kg:0,orders:new Set()}); byC[c].omzet+=(o.regeltotaal||0); byC[c].kg+=(o.netto_gewicht||0); byC[c].orders.add(o.ordernr);});
  const top=Object.entries(byC).sort((a,b)=>b[1].omzet-a[1].omzet).slice(0,10);
  document.querySelector("#top-customers tbody").innerHTML =
    `<tr><th>Klant</th><th class="num">Orders</th><th class="num">Ton</th><th class="num">Omzet</th></tr>`+
    (top.length? top.map(([c,v])=>`<tr style="cursor:default"><td>${c}</td><td class="num">${v.orders.size}</td><td class="num">${ton(v.kg)}</td><td class="num">${eur(v.omzet)}</td></tr>`).join("")
      : `<tr><td colspan="4" class="note">Geen data voor deze selectie.</td></tr>`);
}
function renderStreamPicker(){
  const lbl=document.getElementById("stream-picker-label"); if(lbl) lbl.textContent="("+rapStreamLabelText()+")";
  document.querySelectorAll("#sp-streams .sp-chk").forEach(cb=>{ cb.checked=state.rapStreams.has(cb.dataset.label); });
  const din=document.getElementById("sp-dir-in"), dout=document.getElementById("sp-dir-out");
  if(din) din.classList.toggle("active",state.rapDirection==="in");
  if(dout) dout.classList.toggle("active",state.rapDirection==="out");
}
function renderAll(){ renderKpis(); renderStreams(); renderDetail(); renderStreamPicker(); }

// ---- Map ----
let map=null, layer=null;
function pinSvg(c){return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 28 40"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 26 14 26s14-16.5 14-26C28 6.27 21.73 0 14 0z" fill="${c}"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg>`;}
function initMap(){
  if(map) return;
  map=L.map("map").setView([52.20,4.45],11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(map);
}
function renderMap(){
  if(!LOCS){ document.getElementById("loc-note").textContent="Locatiegegevens worden voorbereid (geocodering)."; return; }
  initMap();
  if(layer) map.removeLayer(layer);
  layer=L.layerGroup().addTo(map);
  const pts=LOCS.filter(p=> state.locFilter==="alle" || p.type===state.locFilter);
  const ll=[];
  pts.forEach(p=>{
    const color=p.type==="installatie"?"#3a7bd5":"#006935";
    const icon=L.divIcon({html:pinSvg(color),className:"pin-icon",iconSize:[26,38],iconAnchor:[13,38],popupAnchor:[0,-34]});
    const m=L.marker([p.lat,p.lng],{icon}).addTo(layer);
    const meta=[ (p.count?p.count+" orders":""), (p.types||""), (p.laatste?"laatst "+p.laatste:"") ].filter(Boolean).join(" &middot; ");
    m.bindPopup(`<b>${p.klant||""}</b><br>${p.adres||""}${meta?("<br>"+meta):""}`);
    ll.push([p.lat,p.lng]);
  });
  document.getElementById("loc-count").textContent=pts.length+" locaties";
  if(ll.length) map.fitBounds(ll,{padding:[40,40]});
  setTimeout(()=>map.invalidateSize(),50);
}

// ---- wiring ----
// ---- period filter (year / half / quarter / month / day) ----
const PART_OPTS=[["all","Heel jaar"],["h1","1e helft (jan-jun)"],["h2","2e helft (jul-dec)"],
  ["q1","Q1 (jan-mrt)"],["q2","Q2 (apr-jun)"],["q3","Q3 (jul-sep)"],["q4","Q4 (okt-dec)"],
  ["01","Januari"],["02","Februari"],["03","Maart"],["04","April"],["05","Mei"],["06","Juni"],
  ["07","Juli"],["08","Augustus"],["09","September"],["10","Oktober"],["11","November"],["12","December"]];
function fillPeriodControls(){
  const years=[...new Set(ORDERS.map(o=>(o.uitvoerdatum||"").slice(0,4)).filter(Boolean))].sort();
  const yearOpts=`<option value="alle">Alle jaren</option>`+years.map(y=>`<option value="${y}">${y}</option>`).join("");
  const partOpts=PART_OPTS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("");
  const dates=ORDERS.map(o=>o.uitvoerdatum).filter(Boolean).sort();
  ["d","f","l"].forEach(p=>{
    const y=document.getElementById(p+"-year"); if(y) y.innerHTML=yearOpts;
    const pa=document.getElementById(p+"-part"); if(pa) pa.innerHTML=partOpts;
    const d=document.getElementById(p+"-day"); if(d){ d.min=dates[0]||""; d.max=dates.at(-1)||""; }
  });
  syncPeriodControls();
}
function periodLabel(){
  if(state.fDay) return state.fDay;
  if(state.fYear==="alle") return "Alle jaren";
  if(/^\d\d$/.test(state.fPart)) return NLM[+state.fPart-1]+" "+state.fYear;
  const suf={all:"",h1:" H1",h2:" H2",q1:" Q1",q2:" Q2",q3:" Q3",q4:" Q4"}[state.fPart]||"";
  return state.fYear+suf;
}
function syncPeriodControls(){
  ["d","f","l"].forEach(p=>{
    const y=document.getElementById(p+"-year"); if(y){ y.value=state.fYear; y.disabled=!!state.fDay; }
    const pa=document.getElementById(p+"-part"); if(pa){ pa.value=state.fPart; pa.disabled=state.fYear==="alle"||!!state.fDay; }
    const d=document.getElementById(p+"-day"); if(d) d.value=state.fDay;
  });
  const lbl=document.getElementById("period-label"); if(lbl) lbl.textContent="Periode: "+periodLabel();
}
function onPeriodChange(){ syncPeriodControls(); renderAll(); renderDashboard(); renderLma(); }
function wirePeriod(){
  ["d","f","l"].forEach(p=>{
    const y=document.getElementById(p+"-year"); if(y) y.onchange=e=>{ state.fYear=e.target.value; state.fDay=""; if(state.fYear==="alle") state.fPart="all"; onPeriodChange(); };
    const pa=document.getElementById(p+"-part"); if(pa) pa.onchange=e=>{ state.fPart=e.target.value; state.fDay=""; onPeriodChange(); };
    const d=document.getElementById(p+"-day"); if(d) d.onchange=e=>{ state.fDay=e.target.value; onPeriodChange(); };
    const r=document.getElementById(p+"-reset"); if(r) r.onclick=()=>{ state.fYear="alle"; state.fPart="all"; state.fDay=""; onPeriodChange(); };
  });
}

// ---- status filter (multi-select; default: invoiced only) ----
const STATUS_ORDER=["Factuur gemaakt","Gereed voor facturatie","Afgerond","Uitgevoerd","Ingepland","Aangemaakt","Geparkeerd"];
function fillStatusControls(){
  const present=[...new Set(ORDERS.map(o=>o.status).filter(Boolean))];
  const ordered=STATUS_ORDER.filter(s=>present.includes(s)).concat(present.filter(s=>!STATUS_ORDER.includes(s)));
  const html=ordered.map(s=>`<button class="chip-toggle" data-st="${s.replace(/"/g,'&quot;')}">${s}</button>`).join("");
  // "f" (Rapportage) intentionally excluded - status filters removed there per client feedback
  ["d","l"].forEach(p=>{const el=document.getElementById(p+"-status"); if(el) el.innerHTML=html;});
  syncStatusControls(); wireStatusControls();
}
function syncStatusControls(){
  ["d","l"].forEach(p=>document.querySelectorAll("#"+p+"-status .chip-toggle").forEach(b=>b.classList.toggle("active",state.statuses.has(b.dataset.st))));
}
function wireStatusControls(){
  ["d","l"].forEach(p=>document.querySelectorAll("#"+p+"-status .chip-toggle").forEach(b=>b.onclick=()=>{
    const s=b.dataset.st; if(state.statuses.has(s)) state.statuses.delete(s); else state.statuses.add(s);
    syncStatusControls(); renderDashboard(); renderLma();
  }));
}

function wireStreamPicker(){
  const btn=document.getElementById("stream-picker-btn"), panel=document.getElementById("stream-picker-panel");
  if(!btn||!panel) return;
  document.getElementById("sp-streams").innerHTML=WASTE_STREAM_MAP.map(s=>
    `<label class="sp-row"><input type="checkbox" class="sp-chk" data-label="${s.label.replace(/"/g,'&quot;')}"/> ${s.label}</label>`
  ).join("");
  btn.onclick=e=>{ e.stopPropagation(); panel.classList.toggle("hidden"); };
  document.addEventListener("click",e=>{ if(!panel.classList.contains("hidden") && !document.getElementById("stream-picker").contains(e.target)) panel.classList.add("hidden"); });
  document.getElementById("sp-dir-in").onclick=()=>{ state.rapDirection="in"; renderAll(); };
  document.getElementById("sp-dir-out").onclick=()=>{ state.rapDirection="out"; renderAll(); };
  document.querySelectorAll("#sp-streams .sp-chk").forEach(cb=>cb.onchange=()=>{
    if(cb.checked) state.rapStreams.add(cb.dataset.label); else state.rapStreams.delete(cb.dataset.label);
    renderAll();
  });
  document.getElementById("sp-clear").onclick=()=>{ state.rapStreams.clear(); renderAll(); };
  document.getElementById("sp-all").onclick=()=>{ WASTE_STREAM_MAP.forEach(s=>state.rapStreams.add(s.label)); renderAll(); };
  document.getElementById("sp-done").onclick=()=>panel.classList.add("hidden");
}

function wire(){
  fillPeriodControls();
  wirePeriod();
  fillStatusControls();
  wireStreamPicker();
  const internalToggle=document.getElementById("rap-internal");
  if(internalToggle) internalToggle.onchange=()=>{ state.rapInternal=internalToggle.checked; renderStreams(); };
  document.querySelectorAll("#lma-table th[data-sort]").forEach(th=>th.onclick=()=>{
    const k=th.dataset.sort; if(lmaState.sortKey===k) lmaState.sortDir*=-1; else {lmaState.sortKey=k; lmaState.sortDir=(k==="orders"||k==="ton")?-1:1;} renderLma();
  });
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); t.classList.add("active");
    const v=t.dataset.tab;
    document.getElementById("view-dashboard").classList.toggle("hidden",v!=="dashboard");
    document.getElementById("view-rapportage").classList.toggle("hidden",v!=="rapportage");
    document.getElementById("view-lma").classList.toggle("hidden",v!=="lma");
    document.getElementById("view-locatie").classList.toggle("hidden",v!=="locatie");
    if(v==="locatie") renderMap();
    if(v==="dashboard") renderDashboard();
    if(v==="lma") renderLma();
  });
  document.querySelectorAll("#loc-filter button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("#loc-filter button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); state.locFilter=b.dataset.l; renderMap();
  });
  wireExports();
}

// ---- Dashboard charts ----
const PAL=["#006935","#529915","#afc729","#3a7bd5","#e0962f","#2b9d6e","#7aa632","#94a3b8","#d98c2b","#1f7bb0","#b06b2a","#5a8f1f"];
let DCHARTS={};
function dRows(){return ORDERS.filter((o)=>matchPeriod(o)&&matchStatus(o));}
function mkChart(id,cfg){if(typeof Chart==="undefined")return;if(DCHARTS[id])DCHARTS[id].destroy();const c=document.getElementById(id);if(c)DCHARTS[id]=new Chart(c,cfg);}
const mlbl=m=>{const[y,mm]=m.split("-");return NLM[+mm-1]+" "+y;};
function renderDashboard(){
  const rows=dRows();
  const orders=new Set(rows.map(o=>o.ordernr)).size;
  const kg=rows.reduce((s,o)=>s+(o.netto_gewicht||0),0);
  const omzet=rows.reduce((s,o)=>s+(o.regeltotaal||0),0);
  const klanten=new Set(rows.map(o=>o.relatie)).size;
  document.getElementById("d-kpis").innerHTML=[
    ["Orders",num(orders),"in periode"],
    ["Verwerkt gewicht",ton(kg)+'<span class="unit">ton</span>',"netto gewogen"],
    ["Omzet (excl)",eur(omzet),"regeltotaal"],
    ["Klanten",num(klanten),"actief in periode"],
  ].map(([l,v,s])=>`<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join("");
  const baseOpts={maintainAspectRatio:false,plugins:{legend:{display:false}}};
  const pgm={};rows.forEach(o=>{const k=o.productgroep||"Onbekend";pgm[k]=(pgm[k]||0)+(o.regeltotaal||0);});
  const pg=Object.entries(pgm).sort((a,b)=>b[1]-a[1]);
  mkChart("ch-omzet",{type:"bar",data:{labels:pg.map(x=>x[0]),datasets:[{data:pg.map(x=>Math.round(x[1])),backgroundColor:"#006935",borderRadius:4}]},options:{...baseOpts,scales:{y:{ticks:{callback:v=>"€ "+v.toLocaleString("nl-NL")}},x:{ticks:{font:{size:10}}}}}});
  const mm={};rows.forEach(o=>{const m=(o.uitvoerdatum||"").slice(0,7);if(!m)return;mm[m]=(mm[m]||0)+(o.netto_gewicht||0)/1000;});
  const ms=Object.keys(mm).sort();
  mkChart("ch-month",{type:"line",data:{labels:ms.map(mlbl),datasets:[{data:ms.map(m=>Math.round(mm[m])),borderColor:"#006935",backgroundColor:"rgba(0,105,53,.12)",fill:true,tension:.3,pointRadius:3}]},options:{...baseOpts,scales:{y:{ticks:{callback:v=>v+" t"}}}}});
  let par=0,zak=0;rows.forEach(o=>{const k=(o.categorie||"").toLowerCase();if(k.includes("particulier"))par++;else if(k.includes("zakelijk")||k.includes("bedrijf"))zak++;});
  mkChart("ch-seg",{type:"doughnut",data:{labels:["Particulier","Zakelijk"],datasets:[{data:[par,zak],backgroundColor:["#3a7bd5","#006935"]}]},options:{...baseOpts,plugins:{legend:{position:"bottom"}},cutout:"58%"}});
  const sv={};rows.forEach(o=>{const k=o.service||"?";sv[k]=(sv[k]||0)+1;});
  const sve=Object.entries(sv).sort((a,b)=>b[1]-a[1]);
  mkChart("ch-service",{type:"doughnut",data:{labels:sve.map(x=>x[0]),datasets:[{data:sve.map(x=>x[1]),backgroundColor:PAL}]},options:{...baseOpts,plugins:{legend:{position:"bottom",labels:{font:{size:10},boxWidth:12}}},cutout:"55%"}});
  const cm={};rows.forEach(o=>{const k=o.relatie||"?";cm[k]=(cm[k]||0)+(o.regeltotaal||0);});
  const top=Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,10).reverse();
  mkChart("ch-top",{type:"bar",data:{labels:top.map(x=>x[0]),datasets:[{data:top.map(x=>Math.round(x[1])),backgroundColor:"#529915",borderRadius:4}]},options:{...baseOpts,indexAxis:"y",scales:{x:{ticks:{callback:v=>"€ "+v.toLocaleString("nl-NL")}}}}});
}

// ---- LMA-meldingen (waste-stream / Eural reporting for statutory notifications) ----
const lmaState={sortKey:"ton",sortDir:-1};
function lmaRows(){
  return ORDERS.filter(o=>matchPeriod(o)&&matchStatus(o)&&o.eural);
}
function lmaAggregate(){
  const m={};
  lmaRows().forEach(o=>{
    const k=o.eural+"|"+(o.verwerking||"");
    (m[k]=m[k]||{eural:o.eural,euralNaam:o.euralNaam||"",verwerking:o.verwerking||"",orders:new Set(),ton:0});
    m[k].orders.add(o.ordernr); m[k].ton+=(o.netto_gewicht||0)/1000;
  });
  return Object.values(m).map(r=>({eural:r.eural,euralNaam:r.euralNaam,verwerking:r.verwerking,orders:r.orders.size,ton:r.ton}));
}
function renderLma(){
  const tbl=document.getElementById("lma-table"); if(!tbl) return;
  const rows=lmaRows();
  const orders=new Set(rows.map(o=>o.ordernr)).size;
  const kg=rows.reduce((s,o)=>s+(o.netto_gewicht||0),0);
  const streams=new Set(rows.map(o=>o.eural)).size;
  document.getElementById("lma-kpis").innerHTML=[
    ["Meldingen",num(orders),"orders met Eural-code"],
    ["Netto aanvoer",ton(kg)+'<span class="unit">ton</span>',"in gekozen periode"],
    ["Eural-codes",num(streams),"unieke codes"],
  ].map(([l,v,s])=>`<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join("");
  let agg=lmaAggregate();
  const k=lmaState.sortKey,d=lmaState.sortDir;
  agg.sort((a,b)=>(typeof a[k]==="string")? a[k].localeCompare(b[k])*d : (a[k]-b[k])*d);
  document.getElementById("lma-count").textContent=agg.length+" Eural-codes";
  document.querySelector("#lma-table tbody").innerHTML=agg.map(r=>`
    <tr>
      <td>${r.eural}</td>
      <td>${r.euralNaam||"-"}</td>
      <td>${r.verwerking||"-"}</td>
      <td class="num">${num(r.orders)}</td>
      <td class="num">${ton(r.ton*1000)}</td>
    </tr>`).join("") || `<tr><td colspan="5" class="note">Geen meldingsplichtige orders in deze selectie.</td></tr>`;
}

// ---- export: CSV download + print/PDF for any rendered table ----
function tableToCsv(tableId){
  const tbl=document.getElementById(tableId); if(!tbl) return "";
  const rows=[...tbl.querySelectorAll("tr")].map(tr=>
    [...tr.children].map(td=>{
      const t=td.textContent.replace(/\s+/g," ").trim().replace(/"/g,'""');
      return /[",;\n]/.test(t)? `"${t}"` : t;
    }).join(";")
  );
  return rows.join("\r\n");
}
function downloadCsv(tableId,filename){
  const csv="﻿"+tableToCsv(tableId);
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
}
// Rapportage export ALWAYS excludes Orders/Omzet, even if the internal on-screen toggle is
// on - these reports go to municipalities/external parties and must never leak financials.
function exportRapportageCsv(){
  const plabel=periodLabel();
  const rows=[["Afvalstroom","Periode","Gewicht (ton)"]];
  if(state.rapDirection==="in"){
    [...state.rapStreams].sort((a,b)=>WASTE_STREAM_MAP.findIndex(s=>s.label===a)-WASTE_STREAM_MAP.findIndex(s=>s.label===b)).forEach(label=>{
      const def=rapStreamDef(label); const prodSet=new Set(def.match);
      const kg=ORDERS.filter(o=>matchPeriod(o)&&prodSet.has(o.productgroep)).reduce((s,o)=>s+(o.netto_gewicht||0),0);
      rows.push([label,plabel,ton(kg)]);
    });
  }
  const csv="﻿"+rows.map(r=>r.map(c=>{ const t=String(c).replace(/"/g,'""'); return /[",;\n]/.test(t)?`"${t}"`:t; }).join(";")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="rapportage-afvalstromen.csv";
  document.body.appendChild(a); a.click(); a.remove();
}
function wireExports(){
  const rc=document.getElementById("rap-csv"); if(rc) rc.onclick=exportRapportageCsv;
  const rp=document.getElementById("rap-print"); if(rp) rp.onclick=()=>window.print();
  const lc=document.getElementById("lma-csv"); if(lc) lc.onclick=()=>downloadCsv("lma-table","lma-meldingen.csv");
  const lp=document.getElementById("lma-print"); if(lp) lp.onclick=()=>window.print();
}

// ---- access gate: data is only released by the server with the correct code ----
async function unlock(code){
  const r=await fetch("/api/oms-live",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
  const d=await r.json().catch(()=>({}));
  if(r.status===202||d.building) return {building:true,msg:d.error};
  if(!r.ok) throw new Error(d.error||"Toegang geweigerd.");
  return d;
}
function showApp(){
  document.getElementById("gate").style.display="none";
  document.getElementById("app-tabs").style.display="";
  document.getElementById("app-wrap").style.display="";
}
function boot(){
  const f=document.getElementById("gate-form");
  f.addEventListener("submit",async e=>{
    e.preventDefault();
    const code=document.getElementById("gate-code").value.trim();
    const err=document.getElementById("gate-err"); err.textContent="";
    const btn=f.querySelector("button"); btn.disabled=true; const lbl=btn.textContent; btn.textContent="Live gegevens laden...";
    const attempt=async()=>{
      try{
        const d=await unlock(code);
        if(d.building){ err.style.color="var(--muted)"; err.textContent=d.msg||"Live gegevens worden voorbereid, een moment..."; btn.textContent="Voorbereiden..."; setTimeout(attempt,12000); return; }
        err.style.color=""; ORDERS=d.orders||[]; CONTRACTS=d.contracts||[]; LOCS=d.locations||null;
        showApp(); wire(); renderAll(); renderDashboard(); renderLma();
      }catch(ex){ err.style.color=""; err.textContent=ex.message; btn.disabled=false; btn.textContent=lbl; }
    };
    attempt();
  });
  document.getElementById("gate-code").focus();
}
boot();
