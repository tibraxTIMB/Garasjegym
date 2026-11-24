"""One bounded, anonymous trial on the official public demo; no retries or login."""
import json, pathlib, shutil, subprocess, hashlib, os
from gradio_client import Client

space = "ACE-Step/Ace-Step-v1.5"
out = pathlib.Path("audio-studio-output")
out.mkdir(exist_ok=True)
spec = json.loads((pathlib.Path(__file__).parent / "generative-studio.json").read_text())
client = Client(space, token=False, download_files=str(out / "raw"))
api = client.view_api(return_format="dict", print_info=False)
(out / "api-schema.json").write_text(json.dumps(api, indent=2, default=str))
print("Public endpoint names:", list(api.get("named_endpoints", {})), flush=True)

def select_endpoint():
    candidates = []
    for endpoint, details in api.get("named_endpoints", {}).items():
        params = {p["parameter_name"]: p for p in details.get("parameters", [])}
        text = next((n for n in ("caption","captions","prompt","song_description","music_caption","description","text_prompt") if n in params), None)
        duration = next((n for n in ("audio_duration","duration","duration_seconds") if n in params), None)
        audio = any("audio" in str(r.get("component","")).lower() or "audio" in str(r.get("label","")).lower() for r in details.get("returns", []))
        if text and duration and audio and ("lyrics" in params or "instrumental" in params):
            candidates.append((endpoint,params,text,duration))
    if len(candidates)!=1:
        exact = [c for c in candidates if c[0] in ("/generate_music","/generate","/generate_music_wrapper")]
        if len(exact)==1: return exact[0]
        raise RuntimeError("No unambiguous published music-generation endpoint; refusing to guess")
    return candidates[0]

endpoint,params,text,duration = select_endpoint()
print("Selected published endpoint:", endpoint, flush=True)
def paths(value):
    if isinstance(value,str):
        p=pathlib.Path(value)
        if p.is_file() and p.suffix.lower() in (".wav",".mp3",".flac",".ogg",".m4a"): yield p
    elif isinstance(value,dict):
        for v in value.values(): yield from paths(v)
    elif isinstance(value,(list,tuple)):
        for v in value: yield from paths(v)

# Short first trial; continue only while provider accepts normal anonymous calls.
# Never rotate identities, use paid credits or retry quota/authentication errors.
for p in sorted(spec["profiles"], key=lambda p: p["id"]!="personal"):
    kwargs={text:p["victory"],duration:12}
    for k,v in {"lyrics":"[Instrumental]","instrumental":True,"bpm":p["bpm"],"key_scale":p["key"],"keyscale":p["key"],"batch_size":1,"audio_format":"wav","task_type":"text2music","thinking":False,"use_random_seed":True}.items():
        if k in params: kwargs[k]=v
    missing=[k for k,v in params.items() if k not in kwargs and not v.get("parameter_has_default",False)]
    if missing: raise RuntimeError("Required parameters without known values: "+str(missing))
    print("Requesting",p["name"],flush=True)
    result=client.predict(api_name=endpoint,**kwargs)
    found=list(paths(result))
    if not found: raise RuntimeError("Model returned no downloadable audio")
    target=out/(p["id"]+"-victory.wav")
    subprocess.run(["ffmpeg","-v","error","-y","-i",str(found[0]),"-ac","2","-ar","48000",str(target)],check=True)
    if target.stat().st_size<48000: raise RuntimeError("Empty audio")
    meta={"space":space,"endpoint":endpoint,"prompt":p["victory"],"sha256":hashlib.sha256(target.read_bytes()).hexdigest(),"reviewed":False}
    (out/(p["id"]+"-victory.json")).write_text(json.dumps(meta,indent=2))
    print("Saved",target,flush=True)
print("Candidate recordings only. No production modification.",flush=True)
