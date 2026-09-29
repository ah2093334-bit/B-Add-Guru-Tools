
// Supabase Edge Function: payment-webhook
// DO NOT activate plans from browser claims, screenshots, OTPs or user-submitted "paid" flags.
// Implement the exact signature verification required by your approved payment provider.
// Only after signature + transaction verification should this function update subscriptions/profiles.
Deno.serve(async (_req)=>{
  return new Response(JSON.stringify({error:"Provider signature verification not configured"}),{status:501,headers:{"Content-Type":"application/json"}});
});
