import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playPronunciationClip } from './pronunciationPlayer';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const NUMERACY_ACCENTS = ['cyan', 'amber', 'emerald', 'rose', 'violet'];

const NUMERACY_ACCENT_STYLES = {
  cyan: {
    badge: 'bg-cyan-100 text-cyan-800',
    header: 'bg-cyan-50 text-cyan-900',
    card: 'border-cyan-200',
    tile: 'border-cyan-100 bg-white text-slate-900 hover:border-cyan-300 hover:bg-cyan-50',
    active: 'border-cyan-500 bg-cyan-600 text-white shadow-md'
  },
  amber: {
    badge: 'bg-amber-100 text-amber-800',
    header: 'bg-amber-50 text-amber-900',
    card: 'border-amber-200',
    tile: 'border-amber-100 bg-white text-slate-900 hover:border-amber-300 hover:bg-amber-50',
    active: 'border-amber-500 bg-amber-500 text-white shadow-md'
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-800',
    header: 'bg-emerald-50 text-emerald-900',
    card: 'border-emerald-200',
    tile: 'border-emerald-100 bg-white text-slate-900 hover:border-emerald-300 hover:bg-emerald-50',
    active: 'border-emerald-500 bg-emerald-600 text-white shadow-md'
  },
  rose: {
    badge: 'bg-rose-100 text-rose-800',
    header: 'bg-rose-50 text-rose-900',
    card: 'border-rose-200',
    tile: 'border-rose-100 bg-white text-slate-900 hover:border-rose-300 hover:bg-rose-50',
    active: 'border-rose-500 bg-rose-600 text-white shadow-md'
  },
  violet: {
    badge: 'bg-violet-100 text-violet-800',
    header: 'bg-violet-50 text-violet-900',
    card: 'border-violet-200',
    tile: 'border-violet-100 bg-white text-slate-900 hover:border-violet-300 hover:bg-violet-50',
    active: 'border-violet-500 bg-violet-600 text-white shadow-md'
  }
};

const NUMBER_WORDS = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty'
];

const NUMBER_LABELS = [
  { amharic: 'አንድ', romanized: 'and' },
  { amharic: 'ሁለት', romanized: 'hulet' },
  { amharic: 'ሦስት', romanized: 'sost' },
  { amharic: 'አራት', romanized: 'arat' },
  { amharic: 'አምስት', romanized: 'amist' },
  { amharic: 'ስድስት', romanized: 'sidist' },
  { amharic: 'ሰባት', romanized: 'sebat' },
  { amharic: 'ስምንት', romanized: 'simint' },
  { amharic: 'ዘጠኝ', romanized: 'zetegn' },
  { amharic: 'አስር', romanized: 'asir' },
  { amharic: 'አስራ አንድ', romanized: 'asra and' },
  { amharic: 'አስራ ሁለት', romanized: 'asra hulet' },
  { amharic: 'አስራ ሦስት', romanized: 'asra sost' },
  { amharic: 'አስራ አራት', romanized: 'asra arat' },
  { amharic: 'አስራ አምስት', romanized: 'asra amist' },
  { amharic: 'አስራ ስድስት', romanized: 'asra sidist' },
  { amharic: 'አስራ ሰባት', romanized: 'asra sebat' },
  { amharic: 'አስራ ስምንት', romanized: 'asra simint' },
  { amharic: 'አስራ ዘጠኝ', romanized: 'asra zetegn' },
  { amharic: 'ሃያ', romanized: 'haya' }
];

const NUMERACY_ITEMS = NUMBER_WORDS.map((word, index) => {
  const value = index + 1;
  const accent = NUMERACY_ACCENTS[index % NUMERACY_ACCENTS.length];
  const label = NUMBER_LABELS[index];

  return {
    id: `number-${value}`,
    value,
    word,
    amharicWord: label.amharic,
    romanized: label.romanized,
    accent,
    audioPath: `/assets/audio/numeracy/${word}.mp3`
  };
});

function NumeracyGrid({ onBack }) {
  const navigate = useNavigate();
  const playbackRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const [selectedNumber, setSelectedNumber] = useState(() => NUMERACY_ITEMS[0]);
  const [playingNumberId, setPlayingNumberId] = useState(null);
  const isOnline = useOnlineStatus();

  const selectedAccent = useMemo(
    () => NUMERACY_ACCENT_STYLES[selectedNumber.accent] || NUMERACY_ACCENT_STYLES.cyan,
    [selectedNumber]
  );

  useEffect(() => {
    return () => {
      playbackTokenRef.current += 1;

      if (playbackRef.current) {
        playbackRef.current.stop();
        playbackRef.current = null;
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleBack = useCallback(() => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }

    navigate('/student/dashboard');
  }, [navigate, onBack]);

  const handleNumberClick = useCallback((item) => {
    playbackTokenRef.current += 1;
    const playbackToken = playbackTokenRef.current;

    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }

    setSelectedNumber(item);
    setPlayingNumberId(item.id);

    playbackRef.current = playPronunciationClip({
      audioPath: item.audioPath,
      fallbackText: item.word,
      language: 'en-US',
      rate: 0.88,
      onFinish: () => {
        if (playbackTokenRef.current === playbackToken) {
          setPlayingNumberId(null);
          playbackRef.current = null;
        }
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <main className="container-fluid space-y-5">
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            aria-label="Back to dashboard"
          >
            <span aria-hidden="true">←</span>
            Back
          </button>
        </div>

        {!isOnline && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            Offline mode: pronunciation will fall back to device speech when audio is unavailable.
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Foundational Counting</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-4xl font-black ${selectedAccent.badge}`}>
                  {selectedNumber.value}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Numeracy Grid</h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                    Tap any number tile to hear the English pronunciation. Each tile shows the Amharic word and the
                    English number name so learners can connect the sound, symbol, and spelling together.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:flex sm:flex-wrap sm:justify-end">
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">20 numbers</span>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Tap to hear</span>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Learn by play</span>
              </div>
            </div>
          </div>

          <div className={`rounded-[1.75rem] border ${NUMERACY_ACCENT_STYLES[selectedNumber.accent]?.card || 'border-slate-200'} bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm sm:p-6`}>
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Now selected</p>
            <div className="mt-4 flex items-start gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-4xl font-black ${selectedAccent.badge}`}>
                {selectedNumber.value}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Count aloud</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">{selectedNumber.amharicWord}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">{selectedNumber.word}</p>
                <p className="mt-2 text-xs text-slate-500">{selectedNumber.word} • Order {selectedNumber.value}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {NUMERACY_ITEMS.map((item) => {
            const accentStyles = NUMERACY_ACCENT_STYLES[item.accent] || NUMERACY_ACCENT_STYLES.cyan;
            const isSelected = selectedNumber.id === item.id;
            const isPlaying = playingNumberId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNumberClick(item)}
                aria-label={`Play pronunciation for number ${item.value}, ${item.word}, ${item.amharicWord}`}
                className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isSelected ? accentStyles.active : accentStyles.tile
                } ${isPlaying ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">Number {item.value}</p>
                    <div className="mt-3 text-4xl font-black leading-none sm:text-5xl">{item.value}</div>
                  </div>
                  <span className="text-base opacity-70">🔊</span>
                </div>
                <p className="mt-3 text-sm font-black uppercase tracking-[0.16em] opacity-95">{item.amharicWord}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">{item.word}</p>
              </button>
            );
          })}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Practice ideas</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">Count, tap, repeat</h3>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Count objects in the room, then tap the matching number to reinforce recognition.
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Replay a number a few times to build memory and confidence before moving to the next one.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default NumeracyGrid;
