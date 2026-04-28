export function playPronunciationClip({
  audioPath,
  fallbackText,
  language = 'am-ET',
  rate = 0.88,
  pitch = 1,
  onStart,
  onFinish
}) {
  if (typeof window === 'undefined') {
    onFinish?.();
    return {
      stop() {}
    };
  }

  let cancelled = false;
  let finished = false;
  let fallbackStarted = false;
  let audio = null;
  let utterance = null;

  const finish = () => {
    if (cancelled || finished) {
      return;
    }

    finished = true;
    onFinish?.();
  };

  const stop = () => {
    cancelled = true;

    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const playSpeechFallback = () => {
    if (cancelled || fallbackStarted) {
      return;
    }

    fallbackStarted = true;

    const text = String(fallbackText || '').trim();
    if (!text || !('speechSynthesis' in window)) {
      finish();
      return;
    }

    window.speechSynthesis.cancel();
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  };

  try {
    onStart?.();
    audio = new Audio(audioPath);
    audio.preload = 'auto';
    audio.onended = finish;
    audio.onerror = playSpeechFallback;
    void audio.play().catch(playSpeechFallback);
  } catch {
    playSpeechFallback();
  }

  return {
    stop
  };
}
