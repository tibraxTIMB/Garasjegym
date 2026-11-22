"""Offline Norwegian narration timed to real help-video screen captures.

The script never contacts a speech API. A locally installed Piper voice reads
the Nynorsk help text and embeds the result in both published video formats.
"""

import re
import time
import wave
from pathlib import Path


def spoken_text(text):
    # Keep the visible Nynorsk intact, but make UI abbreviations and arrows
    # sound like spoken directions rather than punctuation.
    result = text.replace('→', ', deretter ')
    result = re.sub(r'\bPT-en\b', 'den personlege trenaren', result)
    result = re.sub(r'\bPT\b', 'personleg trenar', result)
    result = result.replace(' · ', ', ')
    return result


class VoiceTimeline:
    """Pre-render each line so narration never interrupts the video recording."""

    def __init__(self, voice, scenes, folder):
        self.folder = Path(folder)
        self.clips = []
        self.cues = []
        self.next_clip = 0
        self.epoch = None
        self.sample_rate = None
        for index, scene in enumerate(scenes):
            text = scene['text']
            path = self.folder / f'voice-{index:02}.wav'
            with wave.open(str(path), 'wb') as wav_file:
                voice.synthesize_wav(spoken_text(text), wav_file)
            with wave.open(str(path), 'rb') as wav_file:
                if wav_file.getnchannels() != 1 or wav_file.getsampwidth() != 2:
                    raise ValueError('Piper må laga mono 16-bit lyd')
                rate = wav_file.getframerate()
                duration = wav_file.getnframes() / rate
                if duration < 0.2:
                    raise ValueError(f'For kort opplesing: {text}')
                if self.sample_rate is None:
                    self.sample_rate = rate
                elif rate != self.sample_rate:
                    raise ValueError('Ulik samplingsfrekvens mellom lydklippa')
            self.clips.append((text, path, duration))

    def start(self):
        # Start just before creating the recorded browser tab. The recording
        # includes navigation/loading, so do not assume it starts at scene 1.
        self.epoch = time.monotonic()

    def show_caption(self, page, text, min_seconds=2.8):
        if self.epoch is None:
            raise RuntimeError('Opplesinga er ikkje starta')
        if self.next_clip >= len(self.clips):
            raise AssertionError('Fleire skjermtekstar enn lydklipp')
        expected, path, duration = self.clips[self.next_clip]
        if expected != text:
            raise AssertionError(f'Lyd og skjermtekst er ute av rekkjefølgje: {text}')
        # Use the complete help text; these are all under 160 characters.
        page.evaluate('(caption) => window.__ggVideo.setCaption(caption)', text)
        self.cues.append((time.monotonic() - self.epoch, path, duration))
        self.next_clip += 1
        page.wait_for_timeout(round(1000 * max(min_seconds, duration + 0.65)))

    def write_wav(self, target, video_duration):
        if self.next_clip != len(self.clips):
            raise AssertionError(f'Manglar opplesing for {len(self.clips) - self.next_clip} tekstar')
        frames = bytearray(round((video_duration + 0.15) * self.sample_rate) * 2)
        previous_end = 0
        for cue, path, _duration in self.cues:
            with wave.open(str(path), 'rb') as wav_file:
                audio = wav_file.readframes(wav_file.getnframes())
            start = round((cue + 0.10) * self.sample_rate) * 2
            end = start + len(audio)
            if start < previous_end:
                raise AssertionError('Lydklippa overlappar kvarandre')
            if end > len(frames):
                raise AssertionError('Opplesinga går ut over videoens varigheit')
            frames[start:end] = audio
            previous_end = end
        with wave.open(str(target), 'wb') as result:
            result.setnchannels(1)
            result.setsampwidth(2)
            result.setframerate(self.sample_rate)
            result.writeframes(frames)
