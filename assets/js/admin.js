
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const C=window.APP_CONFIG,sb=createClient(C.supabaseUrl,C.supabaseAnonKey);
const {data:{session}}=await sb.auth.getSession();if(!session)location.href="login.html";
const {data,error}=await sb.functions.invoke("admin-overview",{body:{}});
if(error||data?.error){document.querySelector("#usersTable").textContent=data?.error||error?.message||"Admin access denied";throw new Error("admin")}
document.querySelector("#countUsers").textContent=data.counts.users;
document.querySelector("#countEnt").textContent=data.counts.entitlements;
document.querySelector("#countPayments").textContent=data.counts.payments;
document.querySelector("#countUsage").textContent=data.counts.usage;
document.querySelector("#usersTable").textContent=(data.users||[]).map(x=>`${x.created_at} · ${x.email} · ${x.plan||"free"} · ${x.account_status}`).join("\n")||"No accounts yet.";
document.querySelector("#paymentsTable").textContent=(data.payments||[]).map(x=>`${x.created_at} · ${x.email||x.user_id} · ${x.tool_id||"-"} · ${x.plan||"-"} · ${x.amount||0} ${x.currency||""} · ${x.status}`).join("\n")||"No payment events yet.";
