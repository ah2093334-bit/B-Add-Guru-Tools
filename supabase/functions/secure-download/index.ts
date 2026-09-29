
// Supabase Edge Function: secure-download
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  try{
    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer ")) return new Response(JSON.stringify({error:"Not authenticated"}),{status:401});
    const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error}=await userClient.auth.getUser();
    if(error||!user) return new Response(JSON.stringify({error:"Not authenticated"}),{status:401});
    // Require AAL2 by inspecting the access token payload.
    const token=auth.slice(7); const payload=JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
    if(payload.aal!=="aal2") return new Response(JSON.stringify({error:"Authenticator verification required"}),{status:403});
    const admin=createClient(url,service);
    const {data:profile}=await admin.from("profiles").select("account_status").eq("id",user.id).single();
    if(!profile||profile.account_status!=="active") return new Response(JSON.stringify({error:"Not eligible"}),{status:403});
    const {data:ent}=await admin.from("tool_entitlements").select("plan,status").eq("user_id",user.id).eq("tool_id","cinematic-movie-factory").maybeSingle();
    if(!ent||ent.status!=="active") return new Response(JSON.stringify({error:"Cinematic Movie Factory plan required"}),{status:403});
    const body=await req.json().catch(()=>({}));
    const file=body.file||"B-Add-Guru-Local-Engine-latest.zip";
    const {data:signed,error:se}=await admin.storage.from("software").createSignedUrl(file,300);
    if(se) return new Response(JSON.stringify({error:se.message}),{status:500});
    return new Response(JSON.stringify({url:signed.signedUrl}),{headers:{"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({error:String(e)}),{status:500});}
});
