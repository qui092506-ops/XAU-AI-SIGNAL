const state={market:null,signal:null,history:JSON.parse(localStorage.getItem("xkHistory")||"[]")};
const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";

function sma(a,n){return a.length<n?NaN:a.slice(-n).reduce((x,y)=>x+y,0)/n}
function ema(a,n){if(a.length<n)return NaN;let k=2/(n+1),v=a.slice(0,n).reduce((x,y)=>x+y,0)/n;for(let i=n;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function rsi(a,n=14){if(a.length<=n)return NaN;let gain=0,loss=0;for(let i=1;i<=n;i++){let d=a[i]-a[i-1];if(d>0)gain+=d;else loss-=d}let ag=gain/n,al=loss/n;for(let i=n+1;i<a.length;i++){let d=a[i]-a[i-1];ag=(ag*(n-1)+Math.max(d,0))/n;al=(al*(n-1)+Math.max(-d,0))/n}if(al===0)return 100;return 100-100/(1+ag/al)}
function atr(points,n=14){if(points.length<=n)return NaN;let tr=[];for(let i=1;i<points.length;i++)tr.push(Math.abs(points[i]-points[i-1]));return tr.slice(-n).reduce((a,b)=>a+b,0)/Math.min(n,tr.length)}
function renderHistory(){ $("history").innerHTML=state.history.length?state.history.map(x=>`<div class="history-item"><b class="${x.direction==="BUY"?"buy":x.direction==="SELL"?"sell":"wait"}">${x.direction}</b><span>$${fmt(x.price)}</span><span>${x.strength}</span><small>${x.time}</small></div>`).join(""):`<div class="tiny">No signals yet.</div>`}
function saveSignal(){state.history.unshift({direction:state.signal.direction,price:state.signal.entry,strength:state.signal.strength+"%",time:new Date().toLocaleTimeString()});state.history=state.history.slice(0,15);localStorage.setItem("xkHistory",JSON.stringify(state.history));renderHistory()}

async function loadMarket(){
  $("systemBadge").textContent="LOADING";
  try{
    const r=await fetch("/api/market",{cache:"no-store"});const m=await r.json();if(!r.ok)throw Error(m.error||"Market error");state.market=m;
    $("price").textContent="$"+fmt(m.price);$("feedStatus").textContent=m.status.toUpperCase();$("marketMeta").textContent=`Price as of ${m.asOf||"—"} • ${m.points.length} intraday points`;
    buildSignal(m.points,m.price);
    $("systemBadge").textContent="ONLINE";
  }catch(e){$("systemBadge").textContent="ERROR";$("feedStatus").textContent="ERROR";$("marketMeta").textContent=e.message}
}

function buildSignal(points,price){
  const p=points.map(x=>Number(x.price)).filter(Number.isFinite);if(p.length<20){setWait("Not enough intraday observations.");return}
  const e9=ema(p,9),e21=ema(p,21),r=rsi(p),a=atr(p);
  const recent=p[p.length-1], prev=p[Math.max(0,p.length-6)], mom=((recent-prev)/prev)*100;
  const trend=e9>e21?"BULLISH":e9<e21?"BEARISH":"NEUTRAL";
  const momentum=mom>0.025?"UP":mom<-0.025?"DOWN":"FLAT";
  const rsiBias=r>55?"UP":r<45?"DOWN":"NEUTRAL";
  let dir="WAIT";if(trend==="BULLISH"&&momentum==="UP"&&r>50&&r<78)dir="BUY";if(trend==="BEARISH"&&momentum==="DOWN"&&r>22&&r<50)dir="SELL";
  let score=0;if(dir!=="WAIT"){score+=30;score+=25;score+=rsiBias===(dir==="BUY"?"UP":"DOWN")?20:8;score+=Math.min(20,Math.abs(mom)*180);score=Math.round(Math.min(95,score))}
  $("trend").textContent=trend;$("trend").className=trend==="BULLISH"?"buy":trend==="BEARISH"?"sell":"wait";$("momentum").textContent=momentum;$("momentum").className=momentum==="UP"?"buy":momentum==="DOWN"?"sell":"wait";$("rsi").textContent=Number.isFinite(r)?r.toFixed(1):"—";$("atr").textContent=Number.isFinite(a)?a.toFixed(2):"—";
  $("trendCheck").textContent=trend;$("momentumCheck").textContent=momentum;$("rsiCheck").textContent=rsiBias;$("volCheck").textContent=Number.isFinite(a)?(a>2?"ACTIVE":"LOW"):"—";$("confirmCheck").textContent=dir==="WAIT"?"NO":"YES";$("engineScore").textContent=score?score+"%":"—";
  if(dir==="WAIT"){setWait(`Trend ${trend.toLowerCase()} and momentum ${momentum.toLowerCase()} are not aligned, or RSI filter is not confirmed.`);return}
  const risk=Math.max(Number.isFinite(a)?a*1.15:3,2.5),tp1=risk*1.4,tp2=risk*2.2;
  const sl=dir==="BUY"?price-risk:price+risk,t1=dir==="BUY"?price+tp1:price-tp1,t2=dir==="BUY"?price+tp2:price-tp2;
  state.signal={direction:dir,strength:score,entry:price,sl,tp1:t1,tp2:t2,rr:(tp2/risk).toFixed(1),trend,momentum,rsi:r};
  $("direction").textContent=dir;$("direction").className="direction "+(dir==="BUY"?"buy":"sell");$("strength").textContent=score+"%";$("entry").textContent=fmt(price);$("sl").textContent=fmt(sl);$("tp1").textContent=fmt(t1);$("tp2").textContent=fmt(t2);$("rr").textContent="1:"+state.signal.rr;$("signalTime").textContent=new Date().toLocaleTimeString();
  $("analysis").textContent=`${dir} setup confirmed by EMA trend, recent momentum and RSI filter. Trend: ${trend}. Momentum: ${momentum}. RSI: ${r.toFixed(1)}. This is a technical model output, not a guarantee.`;
  saveSignal();
}
function setWait(msg){state.signal=null;$("direction").textContent="WAIT";$("direction").className="direction wait";["strength","sl","tp1","tp2","rr"].forEach(id=>$(id).textContent="—");$("entry").textContent=state.market?fmt(state.market.price):"—";$("analysis").textContent=msg;$("signalTime").textContent=new Date().toLocaleTimeString()}
async function runAI(){
  if(!state.market||!state.signal){alert("No directional setup is available yet.");return}
  $("analysis").textContent="AI is analysing the current technical setup…";$("aiBtn").disabled=true;
  try{const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({market:state.market,signal:state.signal})});const d=await r.json();if(!r.ok)throw Error(d.error||"AI unavailable");$("analysis").textContent=d.analysis}catch(e){$("analysis").textContent="AI unavailable: "+e.message}finally{$("aiBtn").disabled=false}
}
async function execute(direction){
  const units=Number($("units").value);const mode=$("mode").value;if(!state.signal){alert("Wait for a valid signal first.");return}
  if(mode==="broker"&&!confirm(`Send ${direction} order to the configured broker?`))return;
  $("executionMessage").textContent="Sending…";
  try{const r=await fetch("/api/broker",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"order",mode,direction,units,signal:state.signal})});const d=await r.json();if(!r.ok)throw Error(d.error||"Order failed");$("executionMessage").textContent=d.message||"Order completed."}catch(e){$("executionMessage").textContent="Order error: "+e.message}
}
async function account(){
  try{const r=await fetch("/api/broker?action=status",{cache:"no-store"});const d=await r.json();$("balance").textContent=d.balance||"—";$("positions").textContent=d.positions??"—";$("broker").textContent=d.broker||"Paper"}catch(e){$("broker").textContent="Unavailable"}
}
$("refreshBtn").onclick=loadMarket;$("aiBtn").onclick=runAI;$("buyBtn").onclick=()=>execute("BUY");$("sellBtn").onclick=()=>execute("SELL");$("accountBtn").onclick=account;$("clearBtn").onclick=()=>{state.history=[];localStorage.removeItem("xkHistory");renderHistory()};$("mode").onchange=e=>$("brokerMode").textContent=e.target.value==="broker"?"BROKER MODE":"PAPER MODE";
renderHistory();loadMarket();account();setInterval(loadMarket,30000);
