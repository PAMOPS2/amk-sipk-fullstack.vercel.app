export default async function handler(req,res){
  const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return res.status(500).json({ok:false,error:'SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diatur'});
  try{ const r=await fetch(url.replace(/\/$/, '')+'/rest/v1/sipk_kv?select=path&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key}}); const text=await r.text(); if(!r.ok) return res.status(r.status).json({ok:false,error:'Supabase: '+text}); return res.status(200).json({ok:true,database:'SUPABASE'}); }catch(e){return res.status(500).json({ok:false,error:e.message})}
}
