// OMS-aanvulling demo - runs on real OMS4Business exports (local only).
let ORDERS=[], CONTRACTS=[], LOCS=null;
const state={period:"alle", groupBy:"productgroep", selected:null, sortKey:"omzet", sortDir:-1, locFilter:"alle"};
const NLM=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const eur=n=>"€ "+Math.round(n||0).toLocaleString("nl-NL");
const ton=n=>(n/1000).toLocaleString("nl-NL",{maximumFractionDigits:1});
const num=n=>(n||0).toLocaleString("nl-NL");

function groupVal(o){
  if(state.groupBy==="afvalstroom") return o.afvalstroom||"(geen afvalstroom)";
  if(state.groupBy==="eural") return o.eural||"(geen Eural)";
  return o.productgroep||"Onbekend";
}
function inPeriod(o){ return state.period==="alle" || (o.uitvoerdatum||"").startsWith(state.period); }
function monthKey(o){ return (o.uitvoerdatum||"").slice(0,7); }

function periodOrders(){ return ORDERS.filter(inPeriod); }
function selOrders(){ return periodOrders().filter(o=>!state.selected || groupVal(o)===state.selected); }

function renderKpis(){
  const rows=selOrders();
  const orders=new Set(rows.map(o=>o.ordernr)).size;
  const kg=rows.reduce((s,o)=>s+(o.netto_gewicht||0),0);
  const streams=new Set(rows.map(o=>o.afvalstroom).filter(Boolean)).size;
  const omzet=rows.reduce((s,o)=>s+(o.regeltotaal||0),0);
  document.getElementById("kpis").innerHTML=[
    ["Orders",num(orders),"in periode"+(state.selected?" / stroom":"")],
    ["Verwerkt gewicht",ton(kg)+'<span class="unit">ton</span>',"netto gewogen"],
    ["Afvalstromen",num(streams),"unieke nummers"],
    ["Omzet (excl)",eur(omzet),"regeltotaal"],
  ].map(([l,v,s])=>`<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join("");
}

function aggregate(){
  const m={};
  periodOrders().forEach(o=>{
    const k=groupVal(o);
    (m[k]=m[k]||{key:k,orders:new Set(),ton:0,omzet:0});
    m[k].orders.add(o.ordernr); m[k].ton+=(o.netto_gewicht||0)/1000; m[k].omzet+=(o.regeltotaal||0);
  });
  return Object.values(m).map(r=>({key:r.key,orders:r.orders.size,ton:r.ton,omzet:r.omzet}));
}

function renderStreams(){
  let rows=aggregate();
  const k=state.sortKey, d=state.sortDir;
  rows.sort((a,b)=> (typeof a[k]==="string")? a[k].localeCompare(b[k])*d : (a[k]-b[k])*d);
  const maxO=Math.max(1,...rows.map(r=>r.omzet));
  document.getElementById("stream-count").textContent=rows.length+" stromen";
  document.querySelector("#stream-table tbody").innerHTML=rows.map(r=>`
    <tr data-k="${r.key.replace(/"/g,'&quot;')}" class="${state.selected===r.key?'sel':''}">
      <td>${r.key}</td>
      <td class="num">${num(r.orders)}</td>
      <td class="num">${ton(r.ton*1000)}</td>
      <td class="num barcell">${eur(r.omzet)}<div class="bar" style="width:${Math.max(2,r.omzet/maxO*100)}%"></div></td>
    </tr>`).join("");
  document.querySelectorAll("#stream-table tbody tr").forEach(tr=>{
    tr.onclick=()=>{ const v=tr.getAttribute("data-k"); state.selected = state.selected===v?null:v; renderAll(); };
  });
}

function renderDetail(){
  const rows=selOrders();
  document.getElementById("detail-title").textContent = state.selected? state.selected : "Per maand (alle stromen)";
  document.getElementById("detail-sub").textContent = state.selected? "" : "";
  // monthly
  const byM={};
  rows.forEach(o=>{const m=monthKey(o); if(!m)return; (byM[m]=byM[m]||{kg:0,orders:new Set()}); byM[m].kg+=(o.netto_gewicht||0); byM[m].orders.add(o.ordernr);});
  const months=Object.keys(byM).sort();
  const maxKg=Math.max(1,...months.map(m=>byM[m].kg));
  document.getElementById("detail-months").innerHTML = months.length? months.map(m=>{
    const [y,mm]=m.split("-"); const lbl=`${NLM[+mm-1]} ${y}`;
    return `<div class="month-row"><div class="m">${lbl}</div><div class="b"><span style="width:${byM[m].kg/maxKg*100}%"></span></div><div class="v">${ton(byM[m].kg)} ton &middot; ${byM[m].orders.size} ord.</div></div>`;
  }).join("") : `<div class="note">Geen gewogen orders in deze selectie.</div>`;
  // top customers by omzet
  const byC={};
  rows.forEach(o=>{const c=o.relatie||"(onbekend)"; (byC[c]=byC[c]||{omzet:0,kg:0,orders:new Set()}); byC[c].omzet+=(o.regeltotaal||0); byC[c].kg+=(o.netto_gewicht||0); byC[c].orders.add(o.ordernr);});
  const top=Object.entries(byC).sort((a,b)=>b[1].omzet-a[1].omzet).slice(0,10);
  document.querySelector("#top-customers tbody").innerHTML =
    `<tr><th>Klant</th><th class="num">Orders</th><th class="num">Ton</th><th class="num">Omzet</th></tr>`+
    top.map(([c,v])=>`<tr style="cursor:default"><td>${c}</td><td class="num">${v.orders.size}</td><td class="num">${ton(v.kg)}</td><td class="num">${eur(v.omzet)}</td></tr>`).join("");
}

function renderPill(){
  const el=document.getElementById("sel-pill");
  el.innerHTML = state.selected? `<span class="pill" id="clear-sel">${state.selected}<span class="x">&times;</span></span>` : "";
  if(state.selected){ document.getElementById("clear-sel").onclick=()=>{state.selected=null;renderAll();}; }
}

function renderAll(){ renderKpis(); renderStreams(); renderDetail(); renderPill(); }

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
function wire(){
  const ps=document.getElementById("f-period");
  const months=[...new Set(ORDERS.map(monthKey).filter(Boolean))].sort();
  ps.innerHTML=`<option value="alle">Alle (${months[0]||""} t/m ${months.at(-1)||""})</option>`+
    months.map(m=>{const[y,mm]=m.split("-");return `<option value="${m}">${NLM[+mm-1]} ${y}</option>`;}).join("");
  ps.onchange=e=>{state.period=e.target.value;renderAll();};
  const dp=document.getElementById("d-period");
  if(dp){ dp.innerHTML=ps.innerHTML; dp.onchange=()=>renderDashboard(); }
  document.querySelectorAll("#groupby button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("#groupby button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); state.groupBy=b.dataset.g; state.selected=null; renderAll();
  });
  document.querySelectorAll("#stream-table th[data-sort]").forEach(th=>th.onclick=()=>{
    const k=th.dataset.sort; if(state.sortKey===k) state.sortDir*=-1; else {state.sortKey=k; state.sortDir=k==="key"?1:-1;} renderStreams();
  });
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); t.classList.add("active");
    const v=t.dataset.tab;
    document.getElementById("view-dashboard").classList.toggle("hidden",v!=="dashboard");
    document.getElementById("view-rapportage").classList.toggle("hidden",v!=="rapportage");
    document.getElementById("view-locatie").classList.toggle("hidden",v!=="locatie");
    if(v==="locatie") renderMap();
    if(v==="dashboard") renderDashboard();
  });
  document.querySelectorAll("#loc-filter button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("#loc-filter button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); state.locFilter=b.dataset.l; renderMap();
  });
}

// ---- Dashboard charts ----
const PAL=["#006935","#529915","#afc729","#3a7bd5","#e0962f","#2b9d6e","#7aa632","#94a3b8","#d98c2b","#1f7bb0","#b06b2a","#5a8f1f"];
let DCHARTS={};
function dRows(){const p=document.getElementById("d-period").value;return ORDERS.filter(o=> p==="alle"||(o.uitvoerdatum||"").startsWith(p));}
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

// ---- access gate: data is only released by the server with the correct code ----
async function unlock(code){
  const r=await fetch("/api/oms-demo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
  const d=await r.json().catch(()=>({}));
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
    const btn=f.querySelector("button"); btn.disabled=true; const lbl=btn.textContent; btn.textContent="Bezig...";
    try{
      const d=await unlock(code);
      ORDERS=d.orders||[]; CONTRACTS=d.contracts||[]; LOCS=d.locations||null;
      showApp(); wire(); renderAll(); renderDashboard();
    }catch(ex){ err.textContent=ex.message; btn.disabled=false; btn.textContent=lbl; }
  });
  document.getElementById("gate-code").focus();
}
boot();
