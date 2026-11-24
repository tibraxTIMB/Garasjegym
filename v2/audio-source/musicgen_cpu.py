"""CPU-only text-to-music trial, no hosted inference, no token, no deployment.
MusicGen weights: CC BY-NC 4.0. Noncommercial evaluation only pending review.
"""
import hashlib, json, os, pathlib, time
import numpy as np
import torch
from scipy.io.wavfile import write
from transformers import AutoProcessor, MusicgenForConditionalGeneration

model_id = "facebook/musicgen-stereo-small"
out = pathlib.Path("audio-studio-output")
out.mkdir(exist_ok=True)
spec = json.loads((pathlib.Path(__file__).parent / "generative-studio.json").read_text())
torch.set_num_threads(min(4, os.cpu_count() or 1))
torch.set_num_interop_threads(1)
print("Loading public pretrained weights on CPU:", model_id, flush=True)
processor = AutoProcessor.from_pretrained(model_id, token=False)
model = MusicgenForConditionalGeneration.from_pretrained(model_id, token=False, use_safetensors=True).eval().to("cpu")
rate = int(model.config.audio_encoder.sampling_rate)
print("Loaded. Sample rate:", rate, flush=True)
for index, p in enumerate(sorted(spec["profiles"], key=lambda p: p["id"]!="personal")):
    torch.manual_seed(4900 + index)
    prompt = p["victory"]
    print("Generating", p["name"], flush=True)
    started = time.monotonic()
    inputs = processor(text=[prompt], padding=True, return_tensors="pt")
    with torch.inference_mode():
        waveform = model.generate(**inputs, max_new_tokens=610, do_sample=True, guidance_scale=3.0, temperature=1.0, top_k=250, use_cache=True)
    audio = waveform[0].detach().float().cpu().numpy().T
    if audio.ndim != 2 or audio.shape[1] != 2 or not np.isfinite(audio).all():
        raise RuntimeError("Invalid stereo waveform")
    duration = audio.shape[0] / rate
    peak = float(np.max(np.abs(audio)))
    if not 10 <= duration <= 13 or peak < .001:
        raise RuntimeError(f"Invalid audio duration or amplitude: {duration}s, {peak}")
    audio = audio[:12*rate]
    # Preserve generated music dynamics, avoid digital clipping.
    audio = audio * min(1.0, 0.95 / peak)
    path = out / (p["id"] + "-victory.wav")
    write(path, rate, np.round(audio * 32767).astype(np.int16))
    (out / (p["id"] + "-victory.json")).write_text(json.dumps({
        "model":model_id,"license":"CC BY-NC 4.0 (model weights)","prompt":prompt,
        "sample_rate":rate,"channels":2,"duration":len(audio)/rate,
        "sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
        "listening_reviewed":False,"noncommercial_evaluation_only":True
    }, indent=2))
    print("Saved",path,"after",round(time.monotonic()-started,1),"seconds",flush=True)
print("All three candidate recordings generated. No production modification.",flush=True)
