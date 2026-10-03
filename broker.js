function cfg(){return process.env.OANDA_API_TOKEN&&process.env.OANDA_ACCOUNT_ID}
async function oanda(path,options={}){
  const base=process.env.OANDA_BASE_URL||"https://api-fxpractice.oanda.com";
  return fetch(`${base}${path}`,{...options,headers:{"Authorization":`Bearer ${process.env.OANDA_API_TOKEN}`,"Content-Type":"application/json",...(options.headers||{})}});
}
export default async function handler(req,res){
  try{
    if(req.method==="GET"){
      if(!cfg())return res.status(200).json({broker:"Paper / not configured",balance:"—",positions:"—"});
      const r=await oanda(`/v3/accounts/${process.env.OANDA_ACCOUNT_ID}/summary`);const d=await r.json();if(!r.ok)throw Error(d.errorMessage||"Broker error");
      const p=await oanda(`/v3/accounts/${process.env.OANDA_ACCOUNT_ID}/openTrades`);const pd=await p.json();
      return res.status(200).json({broker:"OANDA",balance:d.account?.balance,positions:Array.isArray(pd.trades)?pd.trades.length:0});
    }
    if(req.method!=="POST")return res.status(405).json({error:"GET/POST only"});
    const {mode,direction,units,signal}=req.body||{};
    if(mode==="paper")return res.status(200).json({message:`Paper ${direction} executed at ${signal?.entry??"market"} (no broker order sent).`});
    if(!cfg())return res.status(503).json({error:"Broker credentials are not configured."});
    if(!Number.isFinite(Number(units))||Number(units)<=0)return res.status(400).json({error:"Units must be greater than 0."});
    if(!signal?.entry)return res.status(400).json({error:"No valid signal."});
    const signed=direction==="SELL"?-Math.abs(Number(units)):Math.abs(Number(units));
    const body={order:{type:"MARKET",instrument:"XAU_USD",units:String(signed),timeInForce:"FOK",positionFill:"DEFAULT",stopLossOnFill:{price:Number(signal.sl).toFixed(2)},takeProfitOnFill:{price:Number(signal.tp2).toFixed(2)}}};
    const r=await oanda(`/v3/accounts/${process.env.OANDA_ACCOUNT_ID}/orders`,{method:"POST",body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.errorMessage||"Broker order rejected");
    res.status(200).json({message:`${direction} order sent to OANDA. Transaction ${d.lastTransactionID||"created"}.`,data:d});
  }catch(e){res.status(500).json({error:e.message})}
}
