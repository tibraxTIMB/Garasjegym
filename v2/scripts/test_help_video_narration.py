"""Fast offline checks: narration follows visible scenes without overlap."""

from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import wave

from help_video_narration import VoiceTimeline, spoken_text


class FakeVoice:
    def synthesize_wav(self, text, handle):
        assert text
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(8000)
        handle.writeframes(struct.pack('<h', 1800) * 8000)


class FakePage:
    def __init__(self):
        self.captions = []
        self.waits = []

    def evaluate(self, _script, caption):
        self.captions.append(caption)

    def wait_for_timeout(self, ms):
        self.waits.append(ms)


class NarrationTests(unittest.TestCase):
    def test_spoken_nynorsk_keeps_words_and_explains_shortcuts(self):
        value = spoken_text('Send til PT → gå til Mi side.')
        self.assertIn('personleg trenar', value)
        self.assertIn('Mi side', value)
        self.assertIn('deretter', value)

    def test_timeline_is_ordered_and_audio_fits_video(self):
        scenes = [{'text': 'Første steg.'}, {'text': 'Neste steg.'}]
        with tempfile.TemporaryDirectory() as folder:
            timeline = VoiceTimeline(FakeVoice(), scenes, folder)
            page = FakePage()
            with patch('help_video_narration.time.monotonic', side_effect=[100.0, 100.1, 101.5]):
                timeline.start()
                timeline.show_caption(page, 'Første steg.', 0.3)
                timeline.show_caption(page, 'Neste steg.', 0.3)
            result = Path(folder) / 'tale.wav'
            timeline.write_wav(result, 3.5)
            self.assertEqual(page.captions, ['Første steg.', 'Neste steg.'])
            self.assertTrue(all(ms >= 1600 for ms in page.waits))
            with wave.open(str(result), 'rb') as output:
                self.assertEqual(output.getframerate(), 8000)
                self.assertEqual(output.getnchannels(), 1)
                self.assertGreater(output.getnframes(), 24000)
                self.assertGreater(max(output.readframes(10000)), 0)

    def test_timeline_rejects_wrong_scene_order(self):
        with tempfile.TemporaryDirectory() as folder:
            timeline = VoiceTimeline(FakeVoice(), [{'text': 'Rett'}], folder)
            timeline.start()
            with self.assertRaisesRegex(AssertionError, 'rekkjefølgje'):
                timeline.show_caption(FakePage(), 'Feil')


if __name__ == '__main__':
    unittest.main()
