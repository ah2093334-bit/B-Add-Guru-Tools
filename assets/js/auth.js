
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const C=window.APP_CONFIG;
const msg=document.querySelector("#msg");
function show(text,ok=false){msg.textContent=text;msg.className="msg "+(ok?"ok":"err")}
if(C.supabaseUrl.startsWith("PASTE_")) show("Setup required: add Supabase URL and anon key in assets/js/config.js");
const sb=createClient(C.supabaseUrl,C.supabaseAnonKey);

const loginTab=document.querySelector("#loginTab"),createTab=document.querySelector("#createTab");
function pane(create){document.querySelector("#createPane").style.display=create?"block":"none";document.querySelector("#loginPane").style.display=create?"none":"block";loginTab.classList.toggle("active",!create);createTab.classList.toggle("active",create)}
loginTab.onclick=()=>pane(false);createTab.onclick=()=>pane(true); if(location.hash==="#create")pane(true);

let pendingEmail="", enrollFactorId="";
document.querySelector("#createBtn").onclick=async()=>{
 const email=document.querySelector("#signupEmail").value.trim(), password=document.querySelector("#signupPassword").value, name=document.querySelector("#name").value.trim(), phone=document.querySelector("#phone").value.trim();
 if(!email||password.length<10){show("Use a valid email and a password of at least 10 characters.");return}
 const {error}=await sb.auth.signUp({email,password,options:{data:{name,phone}}});
 if(error){show(error.message);return}
 pendingEmail=email;document.querySelector("#emailVerifyPane").style.display="block";show("Account created. Check your email for the verification OTP.",true);
};
document.querySelector("#verifyEmailBtn").onclick=async()=>{
 const token=document.querySelector("#emailOtp").value.trim();
 const {error}=await sb.auth.verifyOtp({email:pendingEmail||document.querySelector("#signupEmail").value.trim(),token,type:"email"});
 if(error){show(error.message);return}
 show("Email verified. Set up your authenticator.",true);await beginMFAEnrollment();
};
document.querySelector("#loginBtn").onclick=async()=>{
 const email=document.querySelector("#loginEmail").value.trim(),password=document.querySelector("#loginPassword").value;
 const {error}=await sb.auth.signInWithPassword({email,password});
 if(error){show(error.message);return}
 await routeAfterLogin();
};
async function beginMFAEnrollment(){
 const {data,error}=await sb.auth.mfa.enroll({factorType:"totp",friendlyName:"B Add Guru Authenticator"});
 if(error){show(error.message);return}
 enrollFactorId=data.id;document.querySelector("#mfaQr").src=data.totp.qr_code;document.querySelector("#mfaEnrollPane").style.display="block";
}
document.querySelector("#mfaEnrollBtn").onclick=async()=>{
 const code=document.querySelector("#mfaEnrollCode").value.trim();
 const ch=await sb.auth.mfa.challenge({factorId:enrollFactorId}); if(ch.error){show(ch.error.message);return}
 const vr=await sb.auth.mfa.verify({factorId:enrollFactorId,challengeId:ch.data.id,code}); if(vr.error){show(vr.error.message);return}
 localStorage.setItem("badguru_mfa_day",new Date().toISOString().slice(0,10));location.href="dashboard.html";
};
async function routeAfterLogin(){
 const factors=await sb.auth.mfa.listFactors(); if(factors.error){show(factors.error.message);return}
 const totp=(factors.data.totp||[]).find(x=>x.status==="verified");
 if(!totp){show("Authenticator enrollment is required before the software can open.");await beginMFAEnrollment();return}
 const aal=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
 if(aal.error){show(aal.error.message);return}
 if(aal.data.currentLevel==="aal2"){localStorage.setItem("badguru_mfa_day",new Date().toISOString().slice(0,10));location.href="dashboard.html";return}
 window._factorId=totp.id;document.querySelector("#mfaChallengePane").style.display="block";show("Enter your authenticator code to continue.",true);
}
document.querySelector("#mfaVerifyBtn").onclick=async()=>{
 const factorId=window._factorId, code=document.querySelector("#mfaCode").value.trim();
 const ch=await sb.auth.mfa.challenge({factorId}); if(ch.error){show(ch.error.message);return}
 const vr=await sb.auth.mfa.verify({factorId,challengeId:ch.data.id,code}); if(vr.error){show(vr.error.message);return}
 localStorage.setItem("badguru_mfa_day",new Date().toISOString().slice(0,10));location.href="dashboard.html";
};
const {data:{session}}=await sb.auth.getSession();
if(session){await routeAfterLogin()}
