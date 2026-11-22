"""Free English workout-word pronunciation for GarasjeGym help narration.

Use the existing Norwegian Piper voice for the whole sentence. Only selected
English fitness terms are phonemized with eSpeak's en-us rules and injected as
raw IPA. Ordinary Nynorsk stays untouched to preserve natural sentence flow.

Do not run the Lingit/X-SAMPA word-by-word override from the discarded pilot.
"""

import re


# Keep this list explicit: an automatic language guess would break Norwegian
# words, names and word endings. Spell out common gym acronyms conventionally.
ENGLISH_TERMS = {
    'wall ball shot': 'wall ball shot',
    'snatch complex': 'snatch complex',
    'kettlebell swing': 'kettlebell swing',
    'clean and jerk': 'clean and jerk',
    'box jump over': 'box jump over',
    'toes to bar': 'toes to bar',
    'bench press': 'bench press',
    'dead hang': 'dead hang',
    'front squat': 'front squat',
    'back squat': 'back squat',
    'goblet squat': 'goblet squat',
    'farmers carry': 'farmers carry',
    'kettlebell': 'kettlebell',
    'deadlift': 'deadlift',
    'burpees': 'burpees',
    'thruster': 'thruster',
    'workout': 'workout',
    'pull-up': 'pull up',
    'push-up': 'push up',
    'snatch': 'snatch',
    'complex': 'complex',
    'scaled': 'scaled',
    'foundation': 'foundation',
    'for time': 'for time',
    'time cap': 'time cap',
    'tabata': 'tabata',
    'amrap': 'am rap',
    'emom': 'ee mom',
    'wod': 'wod',
    'row': 'row',
    'rx': 'are ex',
}

_WORD_CHARS = r'A-Za-zÆØÅæøå'
_WORD_RE = re.compile(
    rf'(?<![{_WORD_CHARS}])(?:' +
    '|'.join(re.escape(term).replace(r'\ ', r'\s+') for term in
             sorted(ENGLISH_TERMS, key=len, reverse=True)) +
    rf')(?![{_WORD_CHARS}])',
    re.IGNORECASE,
)


class EnglishWorkoutPronunciation:
    """Code-switch phonemes, never the voice or the Nynorsk prose."""

    def __init__(self, voice, phonemizer):
        self.available = set(voice.config.phoneme_id_map)
        self.phonemizer = phonemizer
        self.cache = {}

    def render(self, text):
        if not text:
            return text
        output = []
        cursor = 0
        for match in _WORD_RE.finditer(text):
            output.append(text[cursor:match.start()])
            term = match.group()
            key = re.sub(r'\s+', ' ', term).lower()
            if key not in self.cache:
                parts = self.phonemizer.phonemize('en-us', ENGLISH_TERMS[key])
                ipa = ' '.join(''.join(sentence) for sentence in parts)
                if not ipa.strip():
                    raise ValueError(f'Manglar engelsk uttale: {term}')
                unknown = sorted(set(ipa) - self.available)
                if unknown:
                    raise ValueError(f'Engelsk uttale av {term} har ukjende fonem: {unknown}')
                self.cache[key] = ipa
            output.append(f'[[{self.cache[key]}]]')
            cursor = match.end()
        output.append(text[cursor:])
        return ''.join(output)
