"""Record the REAL GarasjeGym React UI with only local, synthetic demo data.

Requires a running Vite video-demo server on localhost. Network requests away
from that server are blocked at the browser-context level.
"""

import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from urllib.parse import quote

from playwright.sync_api import sync_playwright


def show_caption(page, text, seconds=2.8):
    # The instructions come directly from helpContent.js via the Node caller.
    short = text if len(text) <= 160 else text[:157].rsplit(' ', 1)[0] + ' …'
    page.evaluate('(text) => window.__ggVideo.setCaption(text)', short)
    page.wait_for_timeout(int(seconds * 1000))


def click(page, name, timeout=8000):
    page.get_by_role('button', name=name).first.click(timeout=timeout)
    page.wait_for_timeout(450)


def record_steps(page, video):
    steps = [scene['text'] for scene in video['scenes'] if scene['kind'] == 'step']
    name = video['id']
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


def build_video(browser, video, base_url, output, tmp):
    context = browser.new_context(
        viewport={'width': 390, 'height': 844}, device_scale_factor=1,
        record_video_dir=str(tmp), record_video_size={'width': 390, 'height': 844},
        locale='nn-NO', color_scheme='dark', reduced_motion='reduce',
    )
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base_url) else route.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    scenario = 'maintenance' if video['id'] == 'reinhald-og-vedlikehald' else 'pt' if video['id'] == 'pt-og-gruppetime' else 'home'
    try:
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
    out = output / f'{video["id"]}.mp4'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(path),
                    '-vf','scale=540:-2,format=yuv420p','-an','-c:v','libx264',
                    '-preset','veryfast','-crf','28','-movflags','+faststart',str(out)],check=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','1','-i',str(out),
                    '-frames:v','1',str(output / f'{video["id"]}.png')],check=True)
    print(f'{video["title"]}: ekte GarasjeGym-vising ({out.stat().st_size // 1024} KiB)',flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:4173')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    videos = json.load(sys.stdin)
    dest = Path(args.output)
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='gg-live-video-') as directory, sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            for video in videos:
                build_video(browser,video,args.base_url,dest,Path(directory))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
