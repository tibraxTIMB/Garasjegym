import pathlib, hashlib, json, wave, math, array, sys
src=pathlib.Path("input-masters")
dest=pathlib.Path("v2/audio-source/pr-masters")
dest.mkdir(exist_ok=True)
hashes=set()
report=[]
for profile in ("personal","pt","group"):
    name=profile+"-victory"
    f=src/(name+".wav")
    m=json.loads((src/(name+".json")).read_text())
    original=hashlib.sha256(f.read_bytes()).hexdigest()
    assert original==m["sha256"] and m["model"]=="facebook/musicgen-stereo-small"
    with wave.open(str(f),"rb") as w:
        channels,width,rate,frames=w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes()
        assert channels==2 and width==2 and rate==32000 and 10*rate<=frames<=12*rate
        pcm=array.array("h",w.readframes(frames))
    if sys.byteorder!="little": pcm.byteswap()
    peak=max(abs(v) for v in pcm)/32768
    rms=math.sqrt(sum(v*v for v in pcm)/len(pcm))/32768
    mono=math.sqrt(sum(((pcm[i]+pcm[i+1])/2)**2 for i in range(0,len(pcm),2))/frames)/32768
    assert peak>.01 and rms>.005 and mono>.005
    gain=min(.86/peak,.14/rms)
    # Gentle boundary fades, no synthesized music or replacement of the recorded composition.
    for i in range(frames):
        fade=min(1,i/(.008*rate),(frames-1-i)/(.16*rate))
        for ch in range(2): pcm[i*2+ch]=round(pcm[i*2+ch]*gain*fade)
    if sys.byteorder!="little": pcm.byteswap()
    output=dest/(profile+"-pr.wav")
    with wave.open(str(output),"wb") as w:
        w.setparams((2,2,rate,frames,"NONE","not compressed"))
        w.writeframes(pcm.tobytes())
    sha=hashlib.sha256(output.read_bytes()).hexdigest()
    assert sha not in hashes
    hashes.add(sha)
    report.append(dict(profile=profile,model=m["model"],source_sha256=original,sha256=sha,seconds=frames/rate,sample_rate=rate,channels=2,source_peak=peak,source_rms=rms,source_mono_rms=mono,gain=gain,prompt=m["prompt"]))
    print(profile,frames/rate,"seconds",sha,flush=True)
(dest/"provenance.json").write_text(json.dumps({"source_run":45418384694,"source_artifact":14933920827,"model_weights_license":"CC BY-NC 4.0","use":"noncommercial private gym only","technical_checks_passed":True,"listening_reviewed":False,"cues":report},indent=2)+"\n")
(dest/"CREDITS.txt").write_text("Three original PR cues generated with Meta MusicGen Stereo Small (facebook/musicgen-stereo-small). Model weights CC BY-NC 4.0: https://creativecommons.org/licenses/by-nc/4.0/ . Model card: https://huggingface.co/facebook/musicgen-stereo-small . Noncommercial GarasjeGym use only. Generated 2026-11-24; mastered with gain adjustment and boundary fades. Not an endorsement by Meta.\n")
