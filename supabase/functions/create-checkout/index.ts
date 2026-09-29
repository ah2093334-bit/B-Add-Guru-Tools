
// Supabase Edge Function: create-checkout
// Intentionally does NOT fake payment confirmation.
// Add your approved Easypaisa/JazzCash/other gateway server API here.
Deno.serve(async (req)=>{
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer ")) return new Response(JSON.stringify({error:"Login required"}),{status:401});
  const {plan}=await req.json().catch(()=>({}));
  if(!["starter","creator","pro"].includes(plan)) return new Response(JSON.stringify({error:"Invalid plan"}),{status:400});
  return new Response(JSON.stringify({error:"Payment gateway not configured. Add approved merchant credentials server-side before enabling checkout."}),{status:501,headers:{"Content-Type":"application/json"}});
});
