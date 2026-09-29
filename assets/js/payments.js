
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const C=window.APP_CONFIG,sb=createClient(C.supabaseUrl,C.supabaseAnonKey);
document.querySelectorAll(".buy").forEach(b=>b.onclick=async()=>{
 const {data:{session}}=await sb.auth.getSession(); if(!session){location.href="login.html";return}
 const {data,error}=await sb.functions.invoke(C.createCheckoutFunction,{body:{plan:b.dataset.plan}});
 if(error||!data?.checkout_url){alert(data?.error||error?.message||"Payment gateway is not configured yet.");return}
 location.href=data.checkout_url;
});
