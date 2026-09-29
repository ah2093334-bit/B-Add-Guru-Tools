
const C=window.APP_CONFIG;
const $=s=>document.querySelector(s);
let engine=null, poll=null;

function setStatus(title,text,progress=0){
  $("#statusTitle").textContent=title; $("#statusText").textContent=text; $("#statusConsole").textContent=text;
  $("#progressBar").style.width=Math.max(0,Math.min(progress,100))+"%";
}
function setStep(n,state){
  const el=[...document.querySelectorAll("#timelineStatus>div")][n-1]; if(!el)return;
  el.classList.toggle("done",state==="Done"); el.classList.toggle("working",state==="Working");
  el.querySelector("em").textContent=state;
}
async function browserHardware(){
  const cores=navigator.hardwareConcurrency||0;
  const ram=navigator.deviceMemory||0;
  let gpu="Unknown";
  try{
    if(navigator.gpu){const a=await navigator.gpu.requestAdapter(); if(a){const info=await a.requestAdapterInfo?.();gpu=(info?.description||info?.vendor||"WebGPU adapter detected")}}
  }catch{}
  return {cores,ram,gpu};
}
async function checkEngine(){
  const bh=await browserHardware();
  $("#deviceInfo").textContent=`Browser: ${bh.cores||"?"} CPU threads · ${bh.ram||"?"} GB reported RAM · ${bh.gpu}`;
  setStep(1,"Working");
  try{
    const r=await fetch(C.localEngineUrl+"/api/status",{cache:"no-store"});
    engine=await r.json();
    $("#deviceInfo").textContent=`${engine.os} · ${engine.cpu_threads} threads · ${engine.ram_gb} GB RAM · ${engine.gpu_name}`;
    $("#deviceBadge").textContent=engine.realistic_ready?"REALISTIC LOCAL READY":"WHITEBOARD READY";
    $("#workflowText").textContent=engine.realistic_ready?`Local realistic model: ${engine.selected_model}`:"Realistic local AI not supported on this hardware. Whiteboard/local editor selected automatically.";
    $("#workflowBadge").textContent=engine.realistic_ready?"LOCAL REALISTIC":"LOCAL WHITEBOARD";
    $("#engineState").textContent="Local Engine Connected";
    setStatus("Local engine connected",engine.message,5);setStep(1,"Done");setStep(2,"Done");
  }catch(e){
    $("#engineState").textContent="Local Engine Offline";
    $("#deviceBadge").textContent="BROWSER ONLY";
    $("#workflowText").textContent="Local engine is not running. Website cannot run heavy offline AI models directly.";
    setStatus("Local engine required","Start the private Local Engine on this computer. Paid cloud features remain server-controlled.",0);setStep(1,"Done");
  }
}
async function create(){
  if(!engine){await checkEngine(); if(!engine){alert("Local Engine is not running.");return}}
  const body={project_type:$("#projectType").value,minutes:+$("#minutes").value,prompt:$("#prompt").value.trim()};
  if(!body.prompt){alert("Enter a topic or prompt.");return}
  setStatus("Starting","Sending project to local engine…",7);setStep(3,"Working");
  const r=await fetch(C.localEngineUrl+"/api/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json(); if(!d.ok){setStatus("Blocked",d.error||"Could not start.",0);return}
  clearInterval(poll);poll=setInterval(readJob,1000);
}
async function readJob(){
  try{
    const d=await (await fetch(C.localEngineUrl+"/api/job",{cache:"no-store"})).json();
    setStatus(d.stage||"Working",d.message||"",d.progress||0);
    const map={Device:1,Mode:2,Script:3,Visuals:4,Voice:5,Render:6,Export:7};
    Object.entries(map).forEach(([k,n])=>{if((d.completed||[]).includes(k))setStep(n,"Done"); else if(d.stage===k)setStep(n,"Working")});
    if(d.output_url){$("#preview").src=C.localEngineUrl+d.output_url+"?t="+Date.now()}
    if(!d.running){clearInterval(poll)}
  }catch{}
}
async function generateImages(){
  if(!engine){await checkEngine();if(!engine)return}
  const topics=$("#imageTopics").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  if(!topics.length){alert("Enter image topics, one per line.");return}
  const d=await (await fetch(C.localEngineUrl+"/api/images",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topics,style:$("#imageStyle").value})})).json();
  if(d.error){alert(d.error);return}
  $("#imageResults").innerHTML=(d.urls||[]).map((u,i)=>`<div class="editorThumb"><img src="${C.localEngineUrl+u}"><span>${i+1}</span></div>`).join("");
}
$("#createBtn").onclick=create;
$("#stopBtn").onclick=async()=>{if(engine)await fetch(C.localEngineUrl+"/api/stop",{method:"POST"});};
$("#genImagesBtn").onclick=generateImages;
checkEngine();
