// Live overzicht - runs on live OMS4Business data via /api/oms-live (gated, server-side key).
let ORDERS=[], PACK=[], CONTRACTS=[], COUNTS={};
const state={period:"alle", groupBy:"service", selected:null, sortKey:"orders", sortDir:-1, cq:""};
const NLM=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const eur=n=>"€ "+Math.round(n||0).toLocaleString("nl-NL");
const num=n=>(n||0).toLocaleString("nl-NL");

const gval=o=> state.groupBy==="product" ? (o.product||"(geen product)") : (o.service||"(geen)");
const inPeriod=o=> state.period==="alle" || (o.date||"").startsWith(state.period);
const mkey=o=>(o.date||"").slice(0,7);
const periodOrders=()=>ORDERS.filter(inPeriod);
const selOrders=()=>periodOrders().filter(o=>!state.selected||gval(o)===state.selected);

function renderKpis(){
  const rows=selOrders();
  const omzet=rows.reduce((s,o)=>s+(o.totalExcl||0),0);
  const active=PACK.filter(p=>p.active).length;
  document.getElementById("kpis").innerHTML=[
    ["Containers",num(PACK.length),active+" actief"],
    ["Orders",num(new Set(rows.map(o=>o.order_nr)).size),"in selectie"],
    ["Omzet (excl)",eur(omzet),"som orderbedragen"],
    ["Contracten",num(CONTRACTS.length),"lopende afspraken"],
  ].map(([l,v,s])=>`<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join("");
}

function aggregate(){
  const m={};
  periodOrders().forEach(o=>{const k=gval(o);(m[k]=m[k]||{key:k,orders:new Set(),omzet:0});m[k].orders.add(o.order_nr);m[k].omzet+=(o.totalExcl||0);});
  return Object.values(m).map(r=>({key:r.key,orders:r.orders.size,omzet:r.omzet}));
}

function renderStreams(){
  let rows=aggregate();
  const k=state.sortKey,d=state.sortDir;
  rows.sort((a,b)=> typeof a[k]==="string"?a[k].localeCompare(b[k])*d:(a[k]-b[k])*d);
  const maxO=Math.max(1,...rows.map(r=>r.omzet));
  document.getElementById("stream-title").textContent = state.groupBy==="product"?"Product":"Soort werk";
  document.getElementById("stream-count").textContent=rows.length+" categorieën";
  document.querySelector("#stream-table tbody").innerHTML=rows.map(r=>`
    <tr data-k="${(r.key||'').replace(/"/g,'&quot;')}" class="${state.selected===r.key?'sel':''}">
      <td>${r.key}</td><td class="num">${num(r.orders)}</td>
      <td class="num barcell">${eur(r.omzet)}<div class="bar" style="width:${Math.max(2,r.omzet/maxO*100)}%"></div></td>
    </tr>`).join("");
  document.querySelectorAll("#stream-table tbody tr").forEach(tr=>tr.onclick=()=>{const v=tr.getAttribute("data-k");state.selected=state.selected===v?null:v;renderAll();});
}

function renderDetail(){
  const rows=selOrders();
  document.getElementById("detail-title").textContent= state.selected?state.selected:"Per maand (alle)";
  const byM={};
  rows.forEach(o=>{const m=mkey(o);if(!m)return;(byM[m]=byM[m]||{omzet:0,orders:new Set()});byM[m].omzet+=(o.totalExcl||0);byM[m].orders.add(o.order_nr);});
  const months=Object.keys(byM).sort().slice(-12);
  const maxO=Math.max(1,...months.map(m=>byM[m].orders.size));
  document.getElementById("detail-months").innerHTML= months.length?months.map(m=>{const[y,mm]=m.split("-");return `<div class="month-row"><div class="m">${NLM[+mm-1]} ${y}</div><div class="b"><span style="width:${byM[m].orders.size/maxO*100}%"></span></div><div class="v">${byM[m].orders.size} ord. · ${eur(byM[m].omzet)}</div></div>`;}).join(""):`<div class="note">Geen orders in deze selectie.</div>`;
  const byC={};
  rows.forEach(o=>{const c=o.relatie||"(onbekend)";(byC[c]=byC[c]||{omzet:0,orders:new Set()});byC[c].omzet+=(o.totalExcl||0);byC[c].orders.add(o.order_nr);});
  const top=Object.entries(byC).sort((a,b)=>b[1].omzet-a[1].omzet).slice(0,10);
  document.querySelector("#top-customers tbody").innerHTML=`<tr><th>Klant</th><th class="num">Orders</th><th class="num">Omzet</th></tr>`+
    top.map(([c,v])=>`<tr style="cursor:default"><td>${c}</td><td class="num">${v.orders.size}</td><td class="num">${eur(v.omzet)}</td></tr>`).join("");
}

function renderPill(){
  const el=document.getElementById("sel-pill");
  el.innerHTML=state.selected?`<span class="pill" id="clr">${state.selected}<span class="x">&times;</span></span>`:"";
  if(state.selected)document.getElementById("clr").onclick=()=>{state.selected=null;renderAll();};
}

function renderContainers(){
  const q=state.cq.trim().toLowerCase();
  const rows=PACK.filter(p=>!q||`${p.number} ${p.type}`.toLowerCase().includes(q));
  document.getElementById("c-count").textContent=rows.length+" containers";
  document.querySelector("#c-table tbody").innerHTML=rows.map(p=>`
    <tr style="cursor:default"><td>${p.number||""}</td><td>${p.type||""}</td>
    <td><span class="badge ${p.active?'st-geleverd':'afgerond'}">${p.active?"Actief":"Inactief"}</span></td>
    <td>${p.rfid||"—"}</td></tr>`).join("");
}

function renderAll(){renderKpis();renderStreams();renderDetail();renderPill();}

function wire(){
  const ps=document.getElementById("f-period");
  const months=[...new Set(ORDERS.map(mkey).filter(Boolean))].sort();
  ps.innerHTML=`<option value="alle">Alle (${months[0]||""} t/m ${months.at(-1)||""})</option>`+months.slice(-24).reverse().map(m=>{const[y,mm]=m.split("-");return `<option value="${m}">${NLM[+mm-1]} ${y}</option>`;}).join("");
  ps.onchange=e=>{state.period=e.target.value;renderAll();};
  document.querySelectorAll("#groupby button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#groupby button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.groupBy=b.dataset.g;state.selected=null;renderAll();});
  document.querySelectorAll("#stream-table th[data-sort]").forEach(th=>th.onclick=()=>{const k=th.dataset.sort;if(state.sortKey===k)state.sortDir*=-1;else{state.sortKey=k;state.sortDir=k==="key"?1:-1;}renderStreams();});
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");const v=t.dataset.tab;document.getElementById("view-rapportage").classList.toggle("hidden",v!=="rapportage");document.getElementById("view-containers").classList.toggle("hidden",v!=="containers");if(v==="containers")renderContainers();});
  document.getElementById("c-search").addEventListener("input",e=>{state.cq=e.target.value;renderContainers();});
}

// ---- gate / load ----
function showApp(){document.getElementById("gate").style.display="none";document.getElementById("app-tabs").style.display="";document.getElementById("app-wrap").style.display="";}
function boot(){
  const f=document.getElementById("gate-form");
  f.addEventListener("submit",async e=>{
    e.preventDefault();
    const code=document.getElementById("gate-code").value.trim();
    const err=document.getElementById("gate-err");err.textContent="";
    const btn=f.querySelector("button");btn.disabled=true;const lbl=btn.textContent;btn.textContent="Live data ophalen...";
    try{
      const r=await fetch("/api/oms-live",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.error||"Toegang geweigerd.");
      ORDERS=d.orders||[];PACK=d.packagings||[];CONTRACTS=d.contracts||[];COUNTS=d.counts||{};
      document.getElementById("live-status").textContent=`Live · ${num(COUNTS.orders||ORDERS.length)} orders · ${num(COUNTS.packagings||PACK.length)} containers`;
      showApp();wire();renderAll();
    }catch(ex){err.textContent=ex.message;btn.disabled=false;btn.textContent=lbl;}
  });
  document.getElementById("gate-code").focus();
}
boot();
