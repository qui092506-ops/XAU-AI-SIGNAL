export default async function handler(req,res){
  try{
    const fresh=Date.now();
    const [spotRes,intraRes]=await Promise.all([
      fetch(`https://xaus.com/api/v1/spot?compact=1&fresh=${fresh}`),
      fetch(`https://xaus.com/api/v1/intraday?symbol=xau&hours=24&fresh=${fresh}`)
    ]);
    const spot=await spotRes.json();const intra=await intraRes.json();
    if(!spotRes.ok) return res.status(502).json({error:spot.error||"Spot feed unavailable"});
    const price=Number(spot.spot_usd_oz??spot.xau?.price);
    const points=(Array.isArray(intra.points)?intra.points:[]).map(x=>({time:x.t,price:Number(x.p)})).filter(x=>Number.isFinite(x.price));
    if(!Number.isFinite(price))return res.status(502).json({error:"Invalid spot price"});
    res.setHeader("Cache-Control","no-store");
    res.status(200).json({price,status:spot.data_state?.status||"fresh",asOf:spot.price_as_of||spot.updated_at,points});
  }catch(e){res.status(500).json({error:e.message})}
}
