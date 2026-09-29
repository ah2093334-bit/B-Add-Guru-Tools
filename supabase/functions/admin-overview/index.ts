
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async(req)=>{
 try{
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer ")) return new Response(JSON.stringify({error:"Login required"}),{status:401});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await userClient.auth.getUser();if(!user)return new Response(JSON.stringify({error:"Login required"}),{status:401});
  const admin=createClient(url,service);
  const {data:me}=await admin.from("profiles").select("role").eq("id",user.id).single();
  if(me?.role!=="admin") return new Response(JSON.stringify({error:"Admin access denied"}),{status:403});
  const usersRes=await admin.auth.admin.listUsers({page:1,perPage:50});
  const profiles=(await admin.from("profiles").select("id,plan,account_status,created_at").order("created_at",{ascending:false}).limit(50)).data||[];
  const pm=new Map(profiles.map((x:any)=>[x.id,x]));
  const users=(usersRes.data?.users||[]).map((u:any)=>({email:u.email,created_at:u.created_at,...(pm.get(u.id)||{})}));
  const payments=(await admin.from("payment_events").select("*").order("created_at",{ascending:false}).limit(50)).data||[];
  const ents=(await admin.from("tool_entitlements").select("id",{count:"exact",head:true}).eq("status","active"));
  const usages=(await admin.from("tool_usage").select("id",{count:"exact",head:true}));
  return new Response(JSON.stringify({counts:{users:usersRes.data?.users?.length||0,entitlements:ents.count||0,payments:payments.length,usage:usages.count||0},users,payments}),{headers:{"Content-Type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:String(e)}),{status:500});}
});
