
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const C=window.APP_CONFIG, sb=createClient(C.supabaseUrl,C.supabaseAnonKey);
const ENGINE="http://127.0.0.1:8787",$=q=>document.querySelector(q);
let connected=false,lastMessage="",timer=null;

function fmt(sec){sec=Math.max(0,Math.round(sec||0));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function line(t){if(!t||t===lastMessage)return;lastMessage=t;const el=$("#liveLog");el.textContent=(new Date().toLocaleTimeString()+"  "+t+"\n"+el.textContent).slice(0,12000)}

async function secureUser(){
 const {data:{session}}=await sb.auth.getSession();if(!session){location.href="login.html";return null}
 const aal=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.data?.currentLevel!=="aal2"){location.href="login.html";return null}
 const {data:ent}=await sb.from("tool_entitlements").select("plan,status,credits_seconds,current_period_end").eq("tool_id","cinematic-movie-factory").maybeSingle();
 if(!ent||ent.status!=="active"){ $("#accessStatus").textContent="Paid/free entitlement required";$("#startLocal").disabled=true;return null}
 $("#accessStatus").textContent=`Active · ${ent.plan} plan`;
 return session;
}
await secureUser();

function renderSteps(steps=[]){
 $("#pipelineSteps").innerHTML=steps.map(s=>`<div class="pipe ${s.state||"pending"}"><b>${s.label}</b><span>${s.note||s.state||"Pending"}</span></div>`).join("");
}
function renderScenes(scenes=[]){
 if(!scenes.length){$("#sceneTimeline").innerHTML='<div class="empty">Scenes will appear after script division.</div>';return}
 $("#sceneTimeline").innerHTML=scenes.map(x=>`<div class="sceneCard ${x.status==="Done"?"done":x.status==="Running"?"running":""}">
   <div class="sceneNum">SCENE ${String(x.scene_number||0).padStart(3,"0")}</div>
   <b>${x.status||"Pending"}</b>
   <p>${x.title||x.visual_prompt||"Scene visual"}</p>
   <small>${x.continuity||"Continuity state locked"}</small>
   <div class="sceneFoot"><span>${fmt(x.seconds||0)}</span><span>${x.merged?"Merged":"Waiting"}</span></div>
  </div>`).join("");
}
async function status(){
 try{
  const r=await fetch(ENGINE+"/status",{cache:"no-store"});const d=await r.json();connected=true;
  $("#engineStatus").textContent="Connected · "+(d.engine_version||"Local Engine");
  $("#hardwareStatus").textContent=`${d.ram_gb||0}GB RAM · ${d.gpu||"GPU unknown"}`;
  $("#wangpStatus").textContent=d.wangp?.ready?`READY · ${d.wangp.detail||"WanGP detected"}`:`${d.wangp?.detail||"Not ready"}`;
  $("#comfyStatus").textContent=d.comfy?.ready?`READY · ${d.comfy.detail||"ComfyUI detected"}`:`${d.comfy?.detail||"Not ready"}`;
  $("#routeStatus").textContent=d.selected_mode_label||d.selected_mode||"Automatic";
  $("#liveMode").textContent=(d.selected_mode||"AUTO").replaceAll("_"," ").toUpperCase();
  $("#creditStatus").textContent=(d.api_credits_used||0)===0?"0 paid API credits used by local route":`${d.api_credits_used} owner API credits used`;
  $("#progress").textContent=(d.progress||0)+"%";$("#stage").textContent=d.stage||"Ready";$("#progressText").textContent=d.message||"Ready";
  $("#readyTime").textContent=fmt(d.ready_seconds||0)+" ready";
  $("#engineHelp").style.display="none";renderSteps(d.pipeline||[]);renderScenes(d.scenes||[]);line(d.message||"");
  if(d.preview_url){$("#resultVideo").src=ENGINE+d.preview_url+"?t="+Date.now();$("#resultVideo").style.display="block";$("#previewText").style.display="none"}
  if(d.result_url){$("#resultVideo").src=ENGINE+d.result_url+"?t="+Date.now();$("#resultVideo").style.display="block";$("#previewText").style.display="none";$("#exportBtn").href=ENGINE+d.result_url;$("#exportBtn").style.display="inline-flex"}
 }catch(e){
  connected=false;$("#engineStatus").textContent="Not connected";$("#hardwareStatus").textContent="Protected Local Engine required";$("#wangpStatus").textContent="Waiting for local engine";$("#comfyStatus").textContent="Waiting for local engine";$("#routeStatus").textContent="Waiting";$("#engineHelp").style.display="block";
 }
}
await status();timer=setInterval(status,2500);

$("#startLocal").onclick=async()=>{
 if(!connected){alert("Local Engine is not connected. Start the protected Local Engine first.");return}
 const fd=new FormData();fd.append("channel_url",$("#channelUrl").value);fd.append("niche",$("#niche").value);fd.append("prompt",$("#prompt").value);fd.append("duration",$("#duration").value);
 for(const f of [...$("#refs").files])fd.append("reference",f);
 line("Start requested. Hardware and route selection begins automatically.");
 const r=await fetch(ENGINE+"/generate",{method:"POST",body:fd});const d=await r.json();if(d.error)alert(d.error);else line(d.message||"Generation started.");
};
$("#stopLocal").onclick=async()=>{try{await fetch(ENGINE+"/stop",{method:"POST"});line("Stop requested.")}catch{}};
$("#genImages").onclick=async()=>{
 if(!connected){alert("Local Engine is not connected.");return}
 const r=await fetch(ENGINE+"/generate-images",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:$("#imagePrompt").value,count:+$("#imageCount").value})});
 const d=await r.json();if(d.error){alert(d.error);return}
 $("#imageResults").innerHTML=(d.images||[]).map((u,i)=>`<img src="${ENGINE+u}?t=${Date.now()+i}" alt="Generated local visual ${i+1}">`).join("");
};
