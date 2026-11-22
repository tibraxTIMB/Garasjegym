"""Record the REAL GarasjeGym React UI with only local, synthetic demo data.

Requires a running Vite video-demo server on localhost. Network requests away
from that server are blocked at the browser-context level.
"""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from urllib.parse import quote

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from help_video_narration import VoiceTimeline
from help_video_pronunciation import EnglishWorkoutPronunciation


def show_caption(page, text, seconds=2.8):
    page._gg_narration.show_caption(page, text, seconds)


def click(page, name, timeout=8000):
    page.get_by_role('button', name=name).first.click(timeout=timeout)
    page.wait_for_timeout(450)


def record_steps(page, video):
    steps = [scene['text'] for scene in video['scenes'] if scene['kind'] == 'step']
    name = video['id']
    show_caption(page, video['scenes'][0]['text'], 2.5)
    if name == 'kom-i-gang':
        show_caption(page, steps[0]); click(page, 'Mi side')
        show_caption(page, steps[1]); click(page, 'Profil og konto')
        show_caption(page, steps[2]); click(page, 'Mi side')
        show_caption(page, steps[3]); click(page, 'Hjelp og rettleiing')
        show_caption(page, steps[4]); click(page, 'Kom i gang')
        click(page, 'Enkel eller avansert visning')
        for step in steps[5:]: show_caption(page, step, 2.2)
    elif name == 'fri-trening':
        show_caption(page, steps[0]); click(page, 'Fri trening')
        page.get_by_role('timer').wait_for(timeout=15000)
        show_caption(page, steps[1]); click(page, 'Start · 10 sek')
        show_caption(page, steps[2]); show_caption(page, steps[3])
        # The clock is full-screen: use its real finish action after 3–2–1.
        page.get_by_role('button', name='Avslutt', exact=True).wait_for(timeout=15000)
        click(page, 'Avslutt')
        for step in steps[4:]: show_caption(page, step, 2.4)
    elif name == 'pt-og-gruppetime':
        show_caption(page, steps[0])
        for step in steps[1:3]: show_caption(page, step, 2.1)
        click(page, 'Ta kontakt med PT')
        show_caption(page, steps[3])
        click(page, 'Kva ønskjer du hjelp med?')
        page.get_by_role('option', name='Eg er berre nysgjerrig').click()
        show_caption(page, steps[4])
        click(page, 'Send førespurnad')
        page.get_by_text('Førespurnaden er sendt.').first.wait_for(timeout=8000)
        click(page, 'Sjå gruppetimar')
        for step in steps[5:7]: show_caption(page, step, 2.4)
        click(page, 'Meld på')
        for step in steps[7:]: show_caption(page, step, 2.4)
    elif name == 'wod-og-klokke':
        show_caption(page, steps[0]); click(page, 'Vel ein WOD')
        page.get_by_text('Stålsnakke · 12 min').first.wait_for(timeout=12000)
        show_caption(page, steps[1]); click(page, 'Vis detaljar')
        show_caption(page, steps[2]); click(page, 'Start økt')
        page.get_by_role('timer').wait_for(timeout=10000)
        show_caption(page, steps[3]); click(page, 'Start · 10 sek')
        for step in steps[4:7]: show_caption(page, step, 2.6)
        for step in steps[7:]: show_caption(page, step, 2.1)
    elif name == 'reinhald-og-vedlikehald':
        page.get_by_text('Reinhald og vedlikehald').first.wait_for(timeout=15000)
        show_caption(page, steps[0]); click(page, 'Vekesjekk')
        show_caption(page, steps[1])
        checks = page.locator('.gm-maintenance-checks input[type="checkbox"]')
        total = checks.count()
        if total < 4: raise AssertionError('Reell vedlikehaldssjekkliste vart ikkje vist')
        for index in range(total-1):
            checks.nth(index).check()
            page.wait_for_timeout(320)
        show_caption(page, steps[2]); checks.nth(total-1).check()
        show_caption(page, steps[3]); click(page, 'Kvitter og lagre')
        for step in steps[4:]: show_caption(page, step, 2.5)
    else:
        raise ValueError(f'Ukjend videoscenario: {name}')
    show_caption(page, video['scenes'][-1]['text'], 2.5)


def build_video(browser, video, base_url, output, tmp, voice, pronunciation, voice_config):
    narration = VoiceTimeline(voice, video['scenes'], tmp / video['id'],
                              pronunciation=pronunciation, syn_config=voice_config)
    context = browser.new_context(
        viewport={'width': 390, 'height': 844}, device_scale_factor=1,
        record_video_dir=str(tmp), record_video_size={'width': 390, 'height': 844},
        locale='nn-NO', color_scheme='dark', reduced_motion='reduce',
    )
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base_url) else route.abort())
    narration.start()
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    scenario = 'maintenance' if video['id'] == 'reinhald-og-vedlikehald' else 'pt' if video['id'] == 'pt-og-gruppetime' else 'home'
    try:
        page._gg_narration = narration
        page.goto(f'{base_url}/video-demo.html?scenario={quote(scenario)}', wait_until='domcontentloaded', timeout=30000)
        page.wait_for_function('Boolean(window.__ggVideo)', timeout=20000)
        page.wait_for_timeout(900)
        record_steps(page, video)
        page.evaluate('window.__ggVideo.setCaption("")')
        page.wait_for_timeout(900)
        if errors: raise RuntimeError('Feil i den verkelege appvisinga: ' + '; '.join(errors[:3]))
        path = page.video.path()
    finally:
        context.close()
    raw_duration = float(subprocess.check_output(['ffprobe','-v','error','-show_entries',
        'format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)], text=True).strip())
    narration_file = tmp / f'{video["id"]}-tale.wav'
    narration.write_wav(narration_file, raw_duration)
    out = output / f'{video["id"]}.mp4'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(path),
                    '-i',str(narration_file),'-map','0:v:0','-map','1:a:0',
                    '-vf','scale=540:-2,format=yuv420p','-c:a','aac','-b:a','80k','-c:v','libx264',
                    '-preset','veryfast','-crf','28','-movflags','+faststart',str(out)],check=True)
    # Chromium's open-source build cannot decode H.264 on every runner.
    # Offer WebM alongside the Android/iOS-compatible MP4 so that there is
    # always a standards-based, genuinely playable fallback.
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(out),
                    '-map','0:v:0','-map','0:a:0','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6',
                    '-crf','43','-b:v','0','-c:a','libopus','-b:a','56k',str(output / f'{video["id"]}.webm')],check=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','1','-i',str(out),
                    '-frames:v','1',str(output / f'{video["id"]}.png')],check=True)
    print(f'{video["title"]}: ekte GarasjeGym-vising ({out.stat().st_size // 1024} KiB)',flush=True)


def verify_inline_player(browser, base_url):
    """The in-app play button must start the new MP4, not just render a poster."""
    context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='nn-NO')
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base_url) else route.abort())
    try:
        page = context.new_page()
        page.goto(base_url + '/video-demo.html?scenario=home', wait_until='domcontentloaded', timeout=30000)
        click(page, 'Mi side')
        click(page, 'Hjelp og rettleiing')
        page.get_by_role('tab', name='Videoar').click(timeout=8000)
        click(page, 'Finn fram i GarasjeGym')
        page.get_by_role('button', name='Spel videoen').click(timeout=8000)
        try:
            page.wait_for_function('''() => {
                const video = document.querySelector('.gg-help-player video');
                return video && !video.paused && video.currentTime > 0.3 && !video.error;
            }''', timeout=15000)
        except PlaywrightTimeoutError as exc:
            details = page.locator('.gg-help-player video').evaluate('''video => ({
                currentSrc: video.currentSrc, currentTime: video.currentTime,
                paused: video.paused, readyState: video.readyState,
                networkState: video.networkState,
                error: video.error?.message,
                mp4: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
                webm: video.canPlayType('video/webm; codecs="vp8"')
            })''')
            raise AssertionError(f'Videoavspeling feila: {details}') from exc
        link = page.get_by_role('link', name='Opna direkte')
        if '/help/videos/kom-i-gang.mp4' not in (link.get_attribute('href') or ''):
            raise AssertionError('Direktelenkja til videoen manglar')
        print('Mobil hjelpespelar: ekte MP4 starta ved trykk og direktelenkja er tilgjengeleg.', flush=True)
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:4173')
    parser.add_argument('--output', required=True)
    parser.add_argument('--voice-model', required=True)
    args = parser.parse_args()
    videos = json.load(sys.stdin)
    dest = Path(args.output)
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='gg-live-video-') as directory, sync_playwright() as pw:
        from piper import PiperVoice, SynthesisConfig
        from piper.phonemize_espeak import ESPEAK_DATA_DIR, EspeakPhonemizer
        voice = PiperVoice.load(args.voice_model)
        pronunciation = EnglishWorkoutPronunciation(voice, EspeakPhonemizer(ESPEAK_DATA_DIR))
        # User-approved pilot 2.1: keep one Norwegian voice throughout, with
        # slightly clearer diction and gentler English/Nynorsk code switching.
        voice_config = SynthesisConfig(length_scale=1.06, noise_scale=0.40,
                                       noise_w_scale=0.25, normalize_audio=True)
        browser = pw.chromium.launch(
            headless=True, args=['--no-sandbox'],
            executable_path=os.environ.get('HELP_VIDEO_CHROMIUM_PATH') or None,
        )
        try:
            for video in videos:
                folder = Path(directory) / video['id']
                folder.mkdir(parents=True, exist_ok=True)
                build_video(browser,video,args.base_url,dest,Path(directory),voice,
                            pronunciation,voice_config)
            verify_inline_player(browser,args.base_url)
        finally:
            browser.close()


if __name__ == '__main__':
    main()
