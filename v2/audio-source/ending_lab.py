"""Noncommercial candidate lab. Real generated waveform only. No added fade, synthesized cadence or automatic deployment."""
import hashlib, json, os, pathlib
import numpy as np
import torch
from scipy.io.wavfile import write
from transformers import AutoProcessor, MusicgenForConditionalGeneration

OUT=pathlib.Path("audio-ending-lab")
OUT.mkdir(exist_ok=True)
MODEL="facebook/musicgen-stereo-small"
spec=json.loads((pathlib.Path(__file__).parent/"generative-studio.json").read_text())
torch.set_num_threads(min(4,os.cpu_count() or 1))
torch.set_num_interop_threads(1)
styles={
 "personal":"148 BPM euphoric European rave trance, pounding club kick, rolling bass, bright supersaw chords, heroic major-key cadence",
 "pt":"heavyweight championship cinematic arena percussion, steel boxing bell, dark bronze gong, orchestral brass and timpani",
 "group":"154 BPM wild Balkan brass, trumpets, trombones, tuba, gypsy-punk and distorted metal guitars, stomping live drums"
}
# Generate spare time AFTER the intended ending so we can test for actual silence.
# In particular, never manufacture a final note by applying a gain envelope.
def prompt(style,signal,take):
    if signal=="pr":
        structure="A complete standalone video game achievement victory fanfare. Immediate bold entrance, rising dramatic melody and percussion, decisive resolved final tutti chord at 9 to 10 seconds, all rhythmic playing stops, natural cymbal or room decay, complete silence afterward. No loop or continuation."
    else:
        structure="A complete standalone video game level-complete musical sting. Immediate attack, short rising rhythmic flourish, decisive resolved tonic chord and final ensemble hit at 3 to 3.5 seconds, all instruments stop together, natural short decay, complete silence afterward. No loop or continuation."
    variation=["A single finished musical phrase, like the final cadence of a championship anthem.","A short composed musical logo with a clear final downbeat and a full stop, not a song excerpt."][take]
    return f"{style}. {structure} {variation} Instrumental, original composition, no speech."
def rms(x):
    return float(np.sqrt(np.mean(np.square(x,dtype=np.float64)))) if x.size else 0.
def screen(audio,rate,signal):
    # 50 ms windows. Relative tail thresholds detect silence/decay, not harmonic resolution.
    step=rate//20
    n=len(audio)//step
    env=np.sqrt(np.mean(audio[:n*step].reshape(n,step,2)**2,axis=(1,2)))
    ref=float(np.quantile(env,.90))
    if ref<.008:return {"accepted":False,"reason":"too quiet"}
    lo,hi=(10,12) if signal=="pr" else (3,5)
    candidates=[]
    for i in range(int(lo*20),int(hi*20)+1):
        if i+20>n:continue
        # Last 0.65 s substantially quiet and next full second stays quiet.
        tail=env[i-13:i+20]
        if float(np.max(tail))>ref*.075:continue
        before=env[max(0,i-70):i-13]
        if len(before)==0 or float(np.max(before))<ref*.65:continue
        # Last strong hit must be near ending; reject long unintentional silence.
        strong=np.flatnonzero(env[:i-13]>=ref*.40)
        if not len(strong):continue
        endgap=(i-strong[-1])/20
        if endgap>2.8:continue
        # No artificial fades: retain model's original ending and a little silence.
        candidates.append((i,float(np.max(tail))/ref,endgap))
    onset=rms(audio[:int(.2*rate)])
    result={"accepted":bool(candidates) and onset>=.003,"reference_rms":ref,"opening_rms":onset,"last_second_rms":rms(audio[-rate:]),"peak":float(np.max(np.abs(audio)))}
    if result["accepted"]:
        i,ratio,gap=min(candidates,key=lambda c:c[0])
        result.update({"end_seconds":i/20,"quiet_ratio":ratio,"seconds_since_last_strong_sound":gap})
    else:result["reason"]="no verified natural quiet ending within target duration" if not candidates else "weak attack"
    return result

processor=AutoProcessor.from_pretrained(MODEL,token=False)
model=MusicgenForConditionalGeneration.from_pretrained(MODEL,token=False,use_safetensors=True).eval().to("cpu")
rate=int(model.config.audio_encoder.sampling_rate)
report={"model":MODEL,"model_weights_license":"CC BY-NC 4.0","scope":"noncommercial review only","listening_reviewed":False,"method":"independent musical stinger generation; natural-end screening only; no fades","takes":[]}
for ix,p in enumerate(spec["profiles"]):
    for signal in ("finish","pr"):
        for take in range(2):
            seed=49000+ix*100+(0 if signal=="finish" else 10)+take
            torch.manual_seed(seed)
            desc=prompt(styles[p["id"]],signal,take)
            print("Generating",p["name"],signal,take+1,flush=True)
            inputs=processor(text=[desc],padding=True,return_tensors="pt")
            with torch.inference_mode():
                output=model.generate(**inputs,max_new_tokens=410 if signal=="finish" else 810,do_sample=True,guidance_scale=3.0,temperature=1.0,top_k=250,use_cache=True)
            audio=output[0].detach().float().cpu().numpy().T
            assert audio.ndim==2 and audio.shape[1]==2 and np.isfinite(audio).all()
            result=screen(audio,rate,signal)
            stem=f'{p["id"]}-{signal}-take{take+1}'
            # Only constant peak gain, no fade, no fake final chord.
            audio=audio*min(1.,.86/max(.001,float(np.max(np.abs(audio)))))
            raw=OUT/(stem+"-raw.wav")
            write(raw,rate,np.round(audio*32767).astype(np.int16))
            entry={"profile":p["id"],"signal":signal,"take":take+1,"seed":seed,"prompt":desc,"raw_sha256":hashlib.sha256(raw.read_bytes()).hexdigest(),**result}
            if result["accepted"]:
                final=OUT/(stem+"-natural-end.wav")
                write(final,rate,np.round(audio[:round(result["end_seconds"]*rate)]*32767).astype(np.int16))
                entry["candidate_sha256"]=hashlib.sha256(final.read_bytes()).hexdigest()
            report["takes"].append(entry)
            (OUT/"review.json").write_text(json.dumps(report,indent=2))
            print(stem,json.dumps(result),flush=True)
print("Natural-end candidates:",sum(t["accepted"] for t in report["takes"]),"of",len(report["takes"]),flush=True)
print("A technical decay check cannot establish a musically resolved cadence. Listening review required. No deployment.",flush=True)
