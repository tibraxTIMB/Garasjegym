"""Create free, synthetic video walkthroughs from the help-centre instructions.

This renderer uses only Pillow and FFmpeg. It does not open a browser, log in to
the app, contact an external service or access any member's personal data.
"""

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont


SIZE = (720, 1280)
BASE = Path('/usr/share/fonts/truetype/dejavu')
FONT_REGULAR = BASE / 'DejaVuSans.ttf'
FONT_BOLD = BASE / 'DejaVuSans-Bold.ttf'
SCREENS = {
    'home': ('Mi side', ['Heim', 'WOD', 'ØKT', 'Timeplan', 'Mi side'], 'Hjelp og rettleiing'),
    'training': ('Fri trening', ['Start klokka', 'Legg til øving', 'Avslutt', 'Lagre økt'], 'Tren i ditt eige tempo'),
    'pt': ('Mi PT-oversikt', ['Sjå PT-ar', 'Send førespurnad', 'Gruppetimar', 'Meld på'], 'Vel det som passar deg'),
    'wod': ('WOD og klokke', ['Vel ein WOD', 'RX / Scaled', 'Start økt', 'Pause / Avslutt'], 'Ei klokke for alle økter'),
    'maintenance': ('Admin · Drift', ['Vekesjekk', 'Månadskontroll', 'Kvartalssjekk', 'Kvitter og lagre'], 'Reinhald og vedlikehald'),
}


def font(size, bold=False):
    path = FONT_BOLD if bold else FONT_REGULAR
    return ImageFont.truetype(str(path), size)


def wrapped(draw, text, left, top, width, size, color, bold=False, max_lines=6, spacing=1.25):
    """Draw legible text wrapped at word boundaries, reducing size if needed."""
    for candidate in (size, size - 2, size - 4, size - 6, size - 8):
        face = font(candidate, bold)
        words = text.split()
        lines = []
        line = ''
        for word in words:
            guess = f'{line} {word}'.strip()
            if line and draw.textlength(guess, font=face) > width:
                lines.append(line)
                line = word
            else:
                line = guess
        if line:
            lines.append(line)
        if len(lines) <= max_lines:
            break
    line_height = int(candidate * spacing)
    for index, line in enumerate(lines[:max_lines]):
        draw.text((left, top + index * line_height), line, font=face, fill=color)
    return top + min(len(lines), max_lines) * line_height


def draw_frame(video, scene, index, total):
    image = Image.new('RGB', SIZE, '#0c171b')
    d = ImageDraw.Draw(image)
    # Light depth without any external images or personal content.
    d.rounded_rectangle((18, 18, 702, 1262), radius=44, fill='#142021')
    d.line((48, 110, 670, 110), fill='#465552', width=2)
    d.text((50, 52), 'GARASJEGYM', font=font(25, True), fill='#f2b261')
    d.text((266, 59), 'FEUER 1.1', font=font(17, True), fill='#d6dfd8')
    d.text((606, 59), f'{index}/{total}', font=font(19, True), fill='#e5c38f')

    if scene['kind'] == 'intro':
        chapter = 'INSTRUKSJONSVIDEO'
    elif scene['kind'] == 'outro':
        chapter = 'PRØV DET SJØLV'
    else:
        chapter = f'STEG {scene["step"]} AV {scene["total"]}'
    d.text((50, 146), chapter, font=font(22, True), fill='#f6bd74')
    wrapped(d, scene['title'], 50, 186, 610, 45, '#f7f1e9', True, 2, 1.18)

    # The illustrated control panel resembles the current dark/orange palette;
    # it is deliberately labelled as an illustration, not a genuine screenshot.
    d.rounded_rectangle((47, 313, 673, 909), radius=28, fill='#1b292a', outline='#6c7d75', width=3)
    d.rounded_rectangle((48, 313, 671, 327), radius=5, fill='#eaa34a')
    d.text((76, 350), 'ILLUSTRERT VISNING', font=font(19, True), fill='#e8ac63')
    heading, actions, subtitle = SCREENS[video['illustration']]
    wrapped(d, heading, 75, 394, 545, 40, '#fff6e7', True, 2)
    d.text((76, 460), subtitle, font=font(19), fill='#adbbb3')
    actions = actions[:5]
    item_height = 76 if len(actions) == 5 else 93
    start_y = 508
    selected = (index - 1) % len(actions)
    for number, label in enumerate(actions):
        top = start_y + number * item_height
        is_selected = number == selected
        fill = '#f2a43f' if is_selected else '#253335'
        outline = '#ffda9e' if is_selected else '#4c605c'
        text = '#211b14' if is_selected else '#e7eee8'
        d.rounded_rectangle((75, top, 646, top + item_height - 12), radius=16,
                            fill=fill, outline=outline, width=2)
        d.ellipse((95, top + 14, 132, top + 51), fill='#bd7c28' if is_selected else '#3c4d4b')
        d.text((105, top + 18), str(number + 1), font=font(17, True), fill='#fff4df')
        d.text((153, top + 17), label, font=font(24, True), fill=text)
        if is_selected:
            d.text((595, top + 15), '›', font=font(30, True), fill=text)

    d.rounded_rectangle((47, 938, 673, 1198), radius=22, fill='#29342e', outline='#556456', width=2)
    d.rounded_rectangle((47, 938, 57, 1198), radius=4, fill='#edac57')
    d.text((77, 964), chapter, font=font(19, True), fill='#f3bc70')
    wrapped(d, scene['text'], 77, 1010, 568, 27, '#f9f3e9', True, 6, 1.34)
    d.rounded_rectangle((48, 1222, 672, 1231), radius=4, fill='#3d4c47')
    d.rounded_rectangle((48, 1222, 48 + int(624 * index / total), 1231), radius=4, fill='#f1a642')
    d.text((48, 1240), 'Illustrert rettleiing · inga medlemsdata', font=font(16), fill='#a8bab1')
    return image


def render_video(video, dest, tmp):
    slides = []
    scenes = video['scenes']
    for index, scene in enumerate(scenes, 1):
        path = tmp / f'{video["id"]}-{index:02}.png'
        draw_frame(video, scene, index, len(scenes)).save(path, optimize=True)
        slides.append((path, 2.5 if scene['kind'] != 'step' else 5.0))
    playlist = tmp / f'{video["id"]}.txt'
    with playlist.open('w', encoding='utf8') as stream:
        for path, duration in slides:
            stream.write(f"file '{path}'\nduration {duration}\n")
        stream.write(f"file '{slides[-1][0]}'\n")
    output = dest / f'{video["id"]}.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
        '-i', str(playlist), '-vf', 'fps=20,format=yuv420p', '-an', '-c:v', 'libx264',
        '-preset', 'veryfast', '-crf', '27', '-movflags', '+faststart', str(output),
    ], check=True)
    shutil.copyfile(slides[0][0], dest / f'{video["id"]}.png')
    print(f'{video["title"]}: {output.name} ({output.stat().st_size // 1024} KiB)', flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--only', choices=[
        'kom-i-gang', 'fri-trening', 'pt-og-gruppetime', 'wod-og-klokke', 'reinhald-og-vedlikehald',
    ])
    options = parser.parse_args()
    if not shutil.which('ffmpeg'):
        parser.error('Installer gratis FFmpeg før du genererer videoane.')
    videos = json.load(sys.stdin)
    if options.only:
        videos = [v for v in videos if v['id'] == options.only]
    dest = Path(options.output)
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='garasjegym-help-') as directory:
        for video in videos:
            render_video(video, dest, Path(directory))


if __name__ == '__main__':
    main()
