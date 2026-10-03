export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST only"});
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"OPENAI_API_KEY is not configured in Vercel."});
  try{
    const {market,signal}=req.body||{};
    const model=process.env.OPENAI_MODEL||"gpt-6-luna";
    const prompt=`You are the analysis module for a gold dashboard. Do not promise profits and do not invent market data. Explain the supplied technical setup in concise plain English. Treat the signal as informational, not a recommendation. Data: ${JSON.stringify({price:market?.price,asOf:market?.asOf,signal})}`;
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model,input:prompt,max_output_tokens:220})});
    const d=await r.json();if(!r.ok)throw Error(d.error?.message||"OpenAI request failed");
    res.status(200).json({analysis:d.output_text||"No AI analysis returned."});
  }catch(e){res.status(500).json({error:e.message})}
}
