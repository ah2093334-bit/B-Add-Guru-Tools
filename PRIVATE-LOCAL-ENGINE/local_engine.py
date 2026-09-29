
import json, os, time, threading, platform, subprocess, shutil, math
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
try:
    import psutil
except:
    psutil=None
try:
    from PIL import Image, ImageDraw, ImageFont
except:
    Image=ImageDraw=ImageFont=None

ROOT=Path(__file__).resolve().parent
OUT=ROOT/"output"; OUT.mkdir(exist_ok=True)
MODELS=ROOT/"models"; MODELS.mkdir(exist_ok=True)
STATE={"running":False,"stage":"Idle","message":"Ready.","progress":0,"completed":[],"output_url":None,"stop":False}

def ram_gb():
    if psutil:
        return round(psutil.virtual_memory().total/(1024**3),1)
    return 0

def detect_gpu():
    name="Unknown GPU"; vram=0; cuda=False
    if platform.system()=="Windows":
        try:
            cmd=["powershell","-NoProfile","-Command","Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json -Compress"]
            raw=subprocess.check_output(cmd,text=True,timeout=8).strip()
            d=json.loads(raw)
            rows=d if isinstance(d,list) else [d]
            if rows:
                name=" / ".join(str(x.get("Name","GPU")) for x in rows)
                for x in rows:
                    try:vram=max(vram,int(x.get("AdapterRAM") or 0)/(1024**3))
                    except:pass
        except: pass
    try:
        if shutil.which("nvidia-smi"):
            q=subprocess.check_output(["nvidia-smi","--query-gpu=name,memory.total","--format=csv,noheader,nounits"],text=True,timeout=8).strip().splitlines()[0]
            n,m=[x.strip() for x in q.rsplit(",",1)]
            name=n;vram=float(m)/1024;cuda=True
    except: pass
    return name,round(vram,1),cuda

def status():
    gpu,vram,cuda=detect_gpu()
    # Conservative automatic policy: local realistic only when NVIDIA CUDA and >=8GB VRAM
    realistic=bool(cuda and vram>=8)
    if realistic:
        model="Wan-compatible local backend (model weights must be installed separately)"
        msg=f"{gpu} detected with about {vram} GB VRAM. Local realistic-video path is eligible."
    else:
        model="Local Whiteboard / Photo Motion"
        msg=f"{gpu} detected. Heavy realistic local AI is not enabled on this hardware; zero-credit whiteboard/local editing is ready."
    return {"os":platform.platform(),"cpu_threads":os.cpu_count() or 0,"ram_gb":ram_gb(),"gpu_name":gpu,"vram_gb":vram,"cuda":cuda,"realistic_ready":realistic,"selected_model":model,"message":msg}

def font(sz,bold=False):
    if not ImageFont:return None
    paths=[
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for p in paths:
        if Path(p).exists():
            try:return ImageFont.truetype(p,sz)
            except:pass
    return ImageFont.load_default()

def make_card(text,path,style="whiteboard",idx=1):
    if not Image: raise RuntimeError("Pillow not installed")
    w,h=1280,720
    bg=(250,250,247) if style!="cards" else (9,17,29)
    im=Image.new("RGB",(w,h),bg);d=ImageDraw.Draw(im)
    dark=(30,34,40) if style!="cards" else (240,246,255)
    accent=(255,210,70) if style=="highlight" else (28,166,245)
    d.rounded_rectangle((40,40,w-40,h-40),radius=26,outline=accent,width=6)
    d.rounded_rectangle((70,70,260,125),radius=16,fill=accent)
    d.text((93,82),f"SCENE {idx:02d}",font=font(25,True),fill=(20,20,20))
    words=text.split(); lines=[];cur=""
    for wd in words:
        test=(cur+" "+wd).strip()
        if d.textlength(test,font=font(44,True))<1020:cur=test
        else: lines.append(cur);cur=wd
    if cur:lines.append(cur)
    y=180
    for line in lines[:5]:
        d.text((100,y),line,font=font(44,True),fill=dark);y+=62
    # doodle line
    d.line((120,560,520,560),fill=accent,width=9)
    d.ellipse((540,500,660,620),outline=accent,width=8)
    d.line((680,560,1160,560),fill=accent,width=9)
    im.save(path)

def make_tts(text,wav):
    if platform.system()!="Windows":
        raise RuntimeError("Local free TTS currently supports Windows.")
    safe=text.replace("'","''"); p=str(wav).replace("'","''")
    ps=f"Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('{p}'); $s.Speak('{safe}'); $s.Dispose();"
    subprocess.run(["powershell","-NoProfile","-Command",ps],check=True,timeout=1200)

def duration(path):
    fp=shutil.which("ffprobe")
    if not fp:return 30.0
    return float(subprocess.check_output([fp,"-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",str(path)],text=True).strip())

def render_whiteboard(prompt,minutes):
    ff=shutil.which("ffmpeg")
    if not ff: raise RuntimeError("FFmpeg is required.")
    STATE.update(stage="Script",message="Building local narration and scene plan…",progress=18); STATE["completed"]=["Device","Mode"]
    # Local deterministic script expansion: no cloud/API.
    sentences=[x.strip() for x in prompt.replace("?","?.").replace("!","!.").split(".") if x.strip()]
    if not sentences: sentences=[prompt]
    target=max(1,min(int(minutes),10))
    count=max(8,target*6)
    scenes=[]
    for i in range(count):
        base=sentences[i%len(sentences)]
        scenes.append(f"{base}. Key point {i+1}: explain this clearly with a simple visual example.")
    narration=" ".join(scenes)
    STATE.update(stage="Visuals",message="Creating local whiteboard visuals…",progress=30);STATE["completed"]+=["Script"]
    imgs=[]
    for i,t in enumerate(scenes,1):
        if STATE["stop"]:raise RuntimeError("Stopped")
        p=OUT/f"scene_{i:03d}.png";make_card(t,p,"highlight" if i%3==0 else "whiteboard",i);imgs.append(p)
        STATE["progress"]=30+int(25*i/len(scenes))
    STATE.update(stage="Voice",message="Creating free local Windows voiceover…",progress=58);STATE["completed"]+=["Visuals"]
    wav=OUT/"voiceover.wav";make_tts(narration,wav)
    total=duration(wav)
    per=max(2.0,total/len(imgs))
    STATE.update(stage="Render",message="Rendering local video with FFmpeg…",progress=66);STATE["completed"]+=["Voice"]
    clips=[]
    for i,img in enumerate(imgs,1):
        if STATE["stop"]:raise RuntimeError("Stopped")
        c=OUT/f"clip_{i:03d}.mp4"
        subprocess.run([ff,"-y","-loop","1","-t",str(per),"-i",str(img),"-vf","scale=1280:720,zoompan=z='min(1.06,1+on*0.0006)':d=1:s=1280x720:fps=30,format=yuv420p","-an","-c:v","libx264","-preset","ultrafast",str(c)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
        clips.append(c);STATE["progress"]=66+int(22*i/len(imgs))
    lst=OUT/"list.txt";lst.write_text("\n".join("file '"+str(x).replace("\\","/")+"'" for x in clips),encoding="utf-8")
    silent=OUT/"silent.mp4"
    subprocess.run([ff,"-y","-f","concat","-safe","0","-i",str(lst),"-c","copy",str(silent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
    final=OUT/"final_whiteboard.mp4"
    subprocess.run([ff,"-y","-i",str(silent),"-i",str(wav),"-c:v","copy","-c:a","aac","-shortest","-movflags","+faststart",str(final)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
    STATE.update(stage="Export",message="Video ready.",progress=100,completed=["Device","Mode","Script","Visuals","Voice","Render","Export"],output_url="/output/"+final.name)

def worker(body):
    try:
        STATE.update(running=True,stop=False,stage="Device",message="Checking hardware…",progress=3,completed=[],output_url=None)
        st=status();STATE["completed"]=["Device"]
        req=body.get("project_type","auto")
        mode="realistic" if (req in ("auto","realistic") and st["realistic_ready"]) else "whiteboard"
        STATE.update(stage="Mode",message=("Local realistic mode selected." if mode=="realistic" else "Whiteboard fallback selected automatically."),progress=8)
        STATE["completed"]+=["Mode"]
        if mode=="realistic":
            # Honest guard: engine eligibility exists, but model weights/backend are not bundled.
            model_files=list(MODELS.glob("*"))
            if not model_files:
                raise RuntimeError("Hardware is eligible, but no local realistic-video model weights are installed. Whiteboard can run now with zero API credits.")
            raise RuntimeError("Local realistic backend adapter is reserved for the installed model package. No cloud API credits were used.")
        render_whiteboard(body.get("prompt","Untitled topic"),body.get("minutes",8))
    except Exception as e:
        STATE.update(stage="Error",message=str(e),running=False)
        return
    STATE["running"]=False

class H(BaseHTTPRequestHandler):
    def _cors(self,code=200,ctype="application/json"):
        self.send_response(code);self.send_header("Access-Control-Allow-Origin","*");self.send_header("Access-Control-Allow-Headers","Content-Type,Authorization");self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS");self.send_header("Content-Type",ctype);self.end_headers()
    def do_OPTIONS(self):self._cors(204)
    def sendj(self,d,code=200):
        self._cors(code);self.wfile.write(json.dumps(d).encode())
    def do_GET(self):
        p=urlparse(self.path).path
        if p=="/api/status":return self.sendj(status())
        if p=="/api/job":return self.sendj(STATE)
        if p.startswith("/output/"):
            f=OUT/p.split("/output/",1)[1]
            if not f.exists():return self.sendj({"error":"not found"},404)
            self._cors(200,"video/mp4" if f.suffix==".mp4" else "image/png");self.wfile.write(f.read_bytes());return
        return self.sendj({"error":"not found"},404)
    def do_POST(self):
        p=urlparse(self.path).path
        n=int(self.headers.get("Content-Length","0") or 0);body={}
        if n:
            try:body=json.loads(self.rfile.read(n))
            except:body={}
        if p=="/api/create":
            if STATE["running"]:return self.sendj({"error":"A job is already running."},409)
            threading.Thread(target=worker,args=(body,),daemon=True).start();return self.sendj({"ok":True})
        if p=="/api/stop":
            STATE["stop"]=True;return self.sendj({"ok":True})
        if p=="/api/images":
            topics=body.get("topics",[])[:60];style=body.get("style","whiteboard");urls=[]
            try:
                for i,t in enumerate(topics,1):
                    f=OUT/f"bulk_{int(time.time())}_{i:03d}.png";make_card(str(t),f,style,i);urls.append("/output/"+f.name)
                return self.sendj({"urls":urls})
            except Exception as e:return self.sendj({"error":str(e)},500)
        return self.sendj({"error":"not found"},404)

if __name__=="__main__":
    print("B Add Guru Local Engine: http://127.0.0.1:8766")
    print(json.dumps(status(),indent=2))
    ThreadingHTTPServer(("127.0.0.1",8766),H).serve_forever()
