"""Fast offline checks: narration follows visible scenes without overlap."""

from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import wave

from help_video_narration import VoiceTimeline, spoken_text
from help_video_pronunciation import EnglishWorkoutPronunciation


class FakeVoice:
    def synthesize_wav(self, text, handle):
        assert text
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(8000)
        handle.writeframes(struct.pack('<h', 1800) * 8000)


class FakePhonemizer:
    def __init__(self):
        self.calls = []

    def phonemize(self, language, text):
        self.calls.append((language, text))
        return [list('snˈætʃ')]


class FakeModel:
    class config:
        phoneme_id_map = {symbol: [index] for index, symbol in
                          enumerate('snˈætʃ ')}


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

    def test_compound_expansion_keeps_natural_nynorsk_in_english_transitions(self):
        spoken = spoken_text('På Heim finn du PT-hjelp og Mi PT-oversikt. '
                             'Du kan leggja til WOD-ar og opna WOD-kortet. '
                             'Sjå PT-ane før du sender ei PT-førespurnad.')
        self.assertIn('hjelp frå ein personleg trenar', spoken)
        self.assertIn('oversikta di over personleg trening', spoken)
        self.assertIn('ferdige treningsøkter', spoken)
        self.assertIn('kortet med økta', spoken)
        self.assertIn('dei personlege trenarane', spoken)
        self.assertIn('førespurnad om personleg trening', spoken)
        self.assertNotIn('WOD-', spoken)
        self.assertNotIn('PT-', spoken)

    def test_english_terms_keep_nynorsk_sentence_and_use_one_norwegian_voice(self):
        phonemizer = FakePhonemizer()
        pronunciation = EnglishWorkoutPronunciation(FakeModel(), phonemizer)
        spoken = spoken_text('Vel ein WOD med snatch og row. PT hjelper.', pronunciation)
        self.assertEqual(spoken, ('Vel ein [[snˈætʃ]] med [[snˈætʃ]] og '
                                  '[[snˈætʃ]]. personleg trenar hjelper.'))
        self.assertEqual(phonemizer.calls, [('en-us', 'wod'),
                                            ('en-us', 'snatch'),
                                            ('en-us', 'row')])
        # Rerendering the same terminology uses cached IPA, no new voice.
        pronunciation.render('WOD og WOD')
        self.assertEqual(len(phonemizer.calls), 3)

    def test_english_matching_preserves_nynorsk_words_and_compounds(self):
        pronunciation = EnglishWorkoutPronunciation(FakeModel(), FakePhonemizer())
        rendered = pronunciation.render('Ei økt med WOD-kortet og ryggøvingar.')
        self.assertEqual(rendered, 'Ei økt med [[snˈætʃ]]-kortet og ryggøvingar.')

    def test_does_not_inject_unknown_acoustic_phonemes(self):
        class BrokenVoice:
            class config:
                phoneme_id_map = {'s': [1]}
        pronunciation = EnglishWorkoutPronunciation(BrokenVoice(), FakePhonemizer())
        with self.assertRaisesRegex(ValueError, 'ukjende fonem'):
            pronunciation.render('snatch')

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
