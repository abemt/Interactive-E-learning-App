import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FIDEL_ACCENT_STYLES, FIDEL_FAMILIES } from './fidelLibrary';
import { playPronunciationClip } from './pronunciationPlayer';
import useOnlineStatus from '../../hooks/useOnlineStatus';

function FidelChart({ onBack }) {
  const navigate = useNavigate();
  const playbackRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const [selectedLetter, setSelectedLetter] = useState(() => FIDEL_FAMILIES[0]?.letters?.[0] || null);
  const [playingLetterId, setPlayingLetterId] = useState(null);
  const [showAllFamilies, setShowAllFamilies] = useState(false);
  const isOnline = useOnlineStatus();

  const selectedFamily = useMemo(
    () =>
      FIDEL_FAMILIES.find((family) => family.id === selectedLetter?.familyId) ||
      FIDEL_FAMILIES[0] ||
      null,
    [selectedLetter]
  );
  const selectedAccent = useMemo(
    () => FIDEL_ACCENT_STYLES[selectedFamily?.accent] || FIDEL_ACCENT_STYLES.cyan,
    [selectedFamily]
  );

  const handleBack = useCallback(() => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }

    navigate('/student/dashboard');
  }, [navigate, onBack]);

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

  const handleLetterClick = useCallback((letter) => {
    playbackTokenRef.current += 1;
    const playbackToken = playbackTokenRef.current;

    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }

    setSelectedLetter(letter);
    setPlayingLetterId(letter.id);

    playbackRef.current = playPronunciationClip({
      audioPath: letter.audioPath,
      fallbackText: letter.pronunciation,
      language: 'am-ET',
      rate: 0.84,
      onFinish: () => {
        if (playbackTokenRef.current === playbackToken) {
          setPlayingLetterId(null);
          playbackRef.current = null;
        }
      }
    });
  }, []);

  if (!selectedLetter || !selectedFamily) {
    return null;
  }

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
            Offline mode: pronunciations will fall back to device speech if audio files are unavailable.
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Foundational Learning</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-4xl font-black ${selectedAccent.badge}`}>
                  {selectedLetter.glyph}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Amharic Fidel Library</h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                    The 34 core Fidel families from the Amharic syllabary. Tap any tile to hear its pronunciation.
                    If an audio file is still missing, the browser will speak the same pronunciation aloud.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:flex sm:flex-wrap sm:justify-end">
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">34 families</span>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">7 orders</span>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Tap to hear</span>
              </div>
            </div>
          </div>

          <div className={`rounded-[1.75rem] border ${selectedAccent.card} bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm sm:p-6`}>
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Now selected</p>
            <div className="mt-4 flex items-start gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-4xl font-black ${selectedAccent.badge}`}>
                {selectedLetter.glyph}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {selectedFamily.title}
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">{selectedLetter.pronunciation}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Order {selectedLetter.order} in the family. Tap another tile to switch playback.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {selectedFamily.letters.map((letter) => {
            const accentStyles = FIDEL_ACCENT_STYLES[selectedFamily.accent] || FIDEL_ACCENT_STYLES.cyan;
            const isSelected = selectedLetter.id === letter.id;
            const isPlaying = playingLetterId === letter.id;

            return (
              <button
                key={letter.id}
                type="button"
                onClick={() => handleLetterClick(letter)}
                aria-label={`Play pronunciation for ${letter.glyph}`}
                className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isSelected ? accentStyles.active : accentStyles.tile
                } ${isPlaying ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">Order {letter.order}</p>
                    <div className="mt-3 text-3xl font-black leading-none sm:text-4xl">{letter.glyph}</div>
                  </div>
                  <span className="text-base opacity-70">🔊</span>
                </div>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] opacity-90">{letter.pronunciation}</p>
                <p className="mt-1 text-xs opacity-75">Tap to hear</p>
              </button>
            );
          })}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Family view</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">Explore all Fidel families</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAllFamilies((previous) => !previous)}
              className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm"
            >
              {showAllFamilies ? 'Hide full list' : 'Show full list'}
            </button>
          </div>

          {showAllFamilies && (
            <div className="grid gap-4 lg:grid-cols-2">
              {FIDEL_FAMILIES.map((family) => {
                const accentStyles = FIDEL_ACCENT_STYLES[family.accent] || FIDEL_ACCENT_STYLES.cyan;

                return (
                  <article key={family.id} className={`overflow-hidden rounded-[1.75rem] border bg-white shadow-sm ${accentStyles.card}`}>
                    <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${accentStyles.header}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-2xl font-black ${accentStyles.badge}`}>
                          {family.glyph}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 sm:text-xl">{family.title}</h3>
                          <p className="text-xs text-slate-600">{family.description}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600 shadow-sm">
                        7 letters
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
                      {family.letters.map((letter) => {
                        const isSelected = selectedLetter.id === letter.id;
                        const isPlaying = playingLetterId === letter.id;

                        return (
                          <button
                            key={letter.id}
                            type="button"
                            onClick={() => handleLetterClick(letter)}
                            aria-label={`Play pronunciation for ${letter.glyph}`}
                            className={`relative rounded-xl border px-2 py-2 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                              isSelected ? accentStyles.active : accentStyles.tile
                            } ${isPlaying ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{letter.order}</span>
                              <span className="text-xs opacity-70">🔊</span>
                            </div>
                            <div className="mt-2 text-2xl font-black leading-none sm:text-3xl">{letter.glyph}</div>
                            <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-85">
                              {letter.pronunciation}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Practice ideas</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">Repeat and listen</h3>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Say the letter aloud, tap the tile, and repeat the sound with a slower rhythm.
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Move left to right inside each family to notice how the vowel pattern changes while the consonant stays the same.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FidelChart;
