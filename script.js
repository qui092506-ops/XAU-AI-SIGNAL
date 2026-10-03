const state={price:4850.00,signal:"BUY",strength:82,history:[]};
const reasonsBuy=["Trend structure is bullish","Support area respected","Momentum confirmation detected","Buying pressure increasing"];
const reasonsSell=["Trend structure is bearish","Resistance area rejected","Momentum confirmation detected","Selling pressure increasing"];

function money(n){return n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
function render(){
  const buy=state.signal==="BUY", p=state.price, entry=p;
  const sl=buy?p-8:p+8, tp1=buy?p+20:p-20, tp2=buy?p+40:p-40;
  document.querySelector("#price").textContent=money(p);
  document.querySelector("#priceChange").textContent=(buy?"+":"-")+Math.abs((state.strength-50)/10).toFixed(2)+"%";
  document.querySelector("#priceChange").className="change "+(buy?"positive":"negative");
  const badge=document.querySelector("#signalBadge"); badge.textContent=state.signal; badge.className="signal-badge "+(buy?"buy":"sell");
  document.querySelector("#direction").textContent=state.signal;
  document.querySelector("#direction").style.color=buy?"#4fd18b":"#ff6577";
  document.querySelector("#strength").textContent=state.strength+"%";
  document.querySelector("#confidenceText").textContent=state.strength+"%";
  document.querySelector("#confidenceBar").style.width=state.strength+"%";
  document.querySelector("#bias").textContent=buy?"BULLISH":"BEARISH";
  document.querySelector("#entry").textContent=money(entry);
  document.querySelector("#sl").textContent=money(sl);
  document.querySelector("#tp1").textContent=money(tp1);
  document.querySelector("#tp2").textContent=money(tp2);
  const ul=document.querySelector("#reasons"); ul.innerHTML="";
  (buy?reasonsBuy:reasonsSell).slice(0,3).forEach(x=>{const li=document.createElement("li");li.textContent=x;ul.appendChild(li)});
  document.querySelector("#signalTime").textContent=new Date().toLocaleTimeString();
  renderHistory();
}
function generate(){
  state.signal=Math.random()>.5?"BUY":"SELL";
  state.strength=Math.floor(70+Math.random()*27);
  const movement=(Math.random()-.45)*18;
  state.price=Math.max(1000,Math.round((state.price+movement)*100)/100);
  const buy=state.signal==="BUY";
  state.history.unshift({time:new Date().toLocaleTimeString(),signal:state.signal,entry:state.price,sl:buy?state.price-8:state.price+8,tp1:buy?state.price+20:state.price-20,strength:state.strength,status:"ACTIVE"});
  state.history=state.history.slice(0,10);
  render(); toast("New simulated "+state.signal+" signal generated.");
}
function renderHistory(){
  const body=document.querySelector("#history"); body.innerHTML="";
  state.history.forEach(r=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${r.time}</td><td><strong style="color:${r.signal==="BUY"?"#4fd18b":"#ff6577"}">${r.signal}</strong></td><td>${money(r.entry)}</td><td>${money(r.sl)}</td><td>${money(r.tp1)}</td><td>${r.strength}%</td><td><span class="status">${r.status}</span></td>`;
    body.appendChild(tr);
  });
}
function toast(msg){const t=document.querySelector("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
document.querySelector("#newSignal").addEventListener("click",generate);
document.querySelector("#clearHistory").addEventListener("click",()=>{state.history=[];renderHistory();toast("Signal history cleared.")});
setInterval(()=>{state.price=Math.round((state.price+(Math.random()-.5)*1.8)*100)/100;document.querySelector("#price").textContent=money(state.price)},3000);
generate();
