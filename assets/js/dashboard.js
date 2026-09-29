
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const C=window.APP_CONFIG,sb=createClient(C.supabaseUrl,C.supabaseAnonKey);
const today=new Date().toISOString().slice(0,10);
if(C.dailyMFALogout && localStorage.getItem("badguru_mfa_day")!==today){await sb.auth.signOut();location.href="login.html";}
const {data:{session}}=await sb.auth.getSession(); if(!session)location.href="login.html";
const aal=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
if(aal.data?.currentLevel!=="aal2"){location.href="login.html";}
document.querySelector("#securityState").textContent="✓ Email + Authenticator verified";
document.querySelector("#welcome").textContent=`Signed in as ${session.user.email}. Protected cloud actions require server-side plan checks.`;
document.querySelector("#logoutBtn").onclick=async()=>{await sb.auth.signOut();localStorage.removeItem("badguru_mfa_day");location.href="login.html"};
document.querySelector("#downloadBtn").onclick=async()=>{
 const el=document.querySelector("#downloadMsg");el.textContent="Checking plan and creating signed download link…";
 const {data,error}=await sb.functions.invoke(C.secureDownloadFunction,{body:{file:"Cinematic-Movie-Factory-latest.zip"}});
 if(error){el.textContent="Download blocked: "+error.message;return}
 if(!data?.url){el.textContent=data?.error||"Not eligible. Choose an active plan or contact support.";return}
 el.innerHTML=`<a class="btn primary" href="${data.url}">Download now</a> <small>Link expires shortly.</small>`;
};
