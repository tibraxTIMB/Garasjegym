"""Make a local, no-cost A/B comparison of the accepted Piper pilot and a polished take.

Use the original recording as reference, and never alter released help videos.
The displayed manuscript is identical in both takes.
"""

import argparse
import base64
from html import escape
from pathlib import Path
import subprocess
import wave

from help_video_narration import spoken_text
from help_video_pronunciation import EnglishWorkoutPronunciation


LINES = [
    ('Velkomen til GarasjeGym.', 0.36),
    ('I denne økta har me ein WOD med wall ball shot, row og snatch complex.', 0.48),
    ('Vel eit nivå som passar deg, og sjå forklaringa før du byrjar.', 0.40),
    ('Du kan velja mellom AMRAP, EMOM og Tabata.', 0.45),
    ('Når du er klar, startar klokka. Tre, to, ein. Køyr!', 0.32),
    ('Etterpå lagrar du rundane dine og ser framgangen, steg for steg.', 0.14),
]


def render(model, target):
    from piper import PiperVoice, SynthesisConfig
    from piper.phonemize_espeak import ESPEAK_DATA_DIR, EspeakPhonemizer

    voice = PiperVoice.load(str(model))
    pronunciation = EnglishWorkoutPronunciation(voice, EspeakPhonemizer(ESPEAK_DATA_DIR))
    config = SynthesisConfig(length_scale=1.06, noise_scale=0.40,
                             noise_w_scale=0.25, normalize_audio=True)
    rate = voice.config.sample_rate
    pcm = bytearray()
    for sentence, pause in LINES:
        for chunk in voice.synthesize(spoken_text(sentence, pronunciation), syn_config=config):
            pcm.extend(chunk.audio_int16_bytes)
        pcm.extend(b'\0\0' * round(pause * rate))

    wav = target.with_suffix('.wav')
    with wave.open(str(wav), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(pcm)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', str(wav), '-vn', '-ar', '24000', '-ac', '1',
                    '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11',
                    '-c:a', 'libmp3lame', '-b:a', '96k', str(target)], check=True)
    wav.unlink()


def build_comparison(original, revised, target):
    sources = [
        (original, '2 · Godkjend utgåve',
         'Den nynorske Piper-stemma med engelsk uttale av treningsord.'),
        (revised, '2.1 · Jamnare flyt',
         'Same røyst og manus. Kortare pausar og litt mjukare artikulasjon.'),
    ]
    cards = []
    for file, title, description in sources:
        media = base64.b64encode(file.read_bytes()).decode('ascii')
        cards.append(f'<section class="card"><h2>{escape(title)}</h2><p>{escape(description)}</p>'
                     f'<audio controls preload="metadata" src="data:audio/mpeg;base64,{media}"'
                     f' aria-label="{escape(title)}"></audio></section>')
    script = ' '.join(sentence for sentence, _pause in LINES)
    html = '''<!doctype html><html lang="nn"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GarasjeGym – samanlikn prøve 2 og 2.1</title>
<style>:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif}
*{box-sizing:border-box}body{background:#0c171a;color:#f8f8f4;margin:0;padding:25px 14px 60px}
main{max-width:740px;margin:auto}.kicker{color:#f3a747;letter-spacing:.11em;font-size:12px;font-weight:800}
h1{font-size:clamp(27px,6vw,40px);line-height:1.12;margin:10px 0 14px}
p{color:#bed0cf;line-height:1.6}.card{background:linear-gradient(130deg,#2c261e,#14272a);
border:1px solid #7b6040;border-radius:17px;padding:18px;margin:16px 0}
.card h2{color:#ffbd66;font-size:22px;margin:0}.card p{margin:9px 0 16px}
audio{width:100%}.script{border:1px solid #4b5c60;border-radius:15px;padding:17px;
margin:22px 0;background:#152529;color:#d9e2e0}.script p{color:#e9eeeb}
footer{border-top:1px solid #435358;padding-top:15px;color:#aabbb8;font-size:13px;line-height:1.6}
</style></head><body><main><div class="kicker">GARASJEGYM · TALEPRØVE</div>
<h1>Er flyten betre i 2.1?</h1><p>Høyr særleg etter overgangen frå nynorsk til <em>WOD</em>, <em>wall ball shot</em>,
<em>row</em>, <em>snatch complex</em>, <em>AMRAP</em> og <em>EMOM</em>.</p>
%%CARDS%%<section class="script"><strong>Same manus i begge prøvane</strong>
<p>%%SCRIPT%%</p></section><footer>Begge prøvane er genererte med gratis, lokal
talesyntese. Ingen publiserte hjelpevideoar blir endra av denne samanlikninga.</footer>
</main><script>document.querySelectorAll('audio').forEach(p=>p.addEventListener('play',()=>{
document.querySelectorAll('audio').forEach(q=>{if(q!==p)q.pause()})}));</script></body></html>'''
    target.write_text(html.replace('%%CARDS%%', ''.join(cards))
                           .replace('%%SCRIPT%%', escape(script)), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--outdir', type=Path, required=True)
    args = parser.parse_args()
    if not args.model.is_file() or not args.baseline.is_file():
        parser.error('Manglar Piper-modell eller opphavleg prøve 2')
    args.outdir.mkdir(parents=True, exist_ok=True)
    revised = args.outdir / 'garasjegym-stemme-2-1.mp3'
    render(args.model, revised)
    comparison = args.outdir / 'garasjegym-stemme-2-mot-2-1.html'
    build_comparison(args.baseline, revised, comparison)
    print(f'Ny prøve: {revised}\nSamanlikning: {comparison}')


if __name__ == '__main__':
    main()
