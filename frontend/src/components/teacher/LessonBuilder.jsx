import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../../services/apiClient';

const themeOptions = ['Space', 'Nature', 'Lab'];

const resolveMediaUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const apiOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
};

const safeParseJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeTheme = (theme) => (themeOptions.includes(theme) ? theme : 'Space');

const createEmptyCard = (seed = 0, card = {}) => ({
  id: `${Date.now()}-${Math.random()}-${seed}`,
  textContent: String(card.textContent || ''),
  visualTheme: normalizeTheme(card.visualTheme),
  imageFile: null,
  audioFile: null,
  audioPreviewUrl: '',
  imageUrl: String(card.imageUrl || card.existingImageUrl || ''),
  audioUrl: String(card.audioUrl || card.existingAudioUrl || '')
});

function LessonBuilder() {
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryClassId = queryParams.get('classId');
  const queryModuleId = queryParams.get('moduleId');
  const queryLessonId = queryParams.get('lessonId');
  const queryMode = String(queryParams.get('mode') || '').toLowerCase();
  const isEditMode = queryMode === 'edit' && Boolean(queryLessonId);

  const [assignedClasses, setAssignedClasses] = useState([]);
  const [modules, setModules] = useState([]);
  const [classId, setClassId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState('1');
  const [cards, setCards] = useState([createEmptyCard(1)]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedEditData, setHasLoadedEditData] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recordingCardId, setRecordingCardId] = useState(null);
  const [recordingError, setRecordingError] = useState('');
  const [recordingErrorCardId, setRecordingErrorCardId] = useState(null);
  const originalLessonRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const discardRecordingRef = useRef(false);
  const audioPreviewUrlsRef = useRef(new Map());

  const selectedModule = useMemo(
    () => modules.find((module) => String(module.id) === String(moduleId)) || null,
    [modules, moduleId]
  );

  useEffect(() => {
    const loadAssignedClasses = async () => {
      setIsLoadingClasses(true);
      setError('');

      try {
        const { data } = await apiClient.get('/content/teacher/classes');
        const classList = data?.data || [];
        setAssignedClasses(classList);

        if (classList.length === 0) {
          setClassId('');
          setModuleId('');
          setError('No class sections are assigned to your teacher account yet.');
          return;
        }

        const hasQueryClass = classList.some((item) => String(item.id) === String(queryClassId));
        const resolvedClassId = hasQueryClass ? String(queryClassId) : String(classList[0].id);
        setClassId(resolvedClassId);

        if (queryModuleId) {
          setModuleId(String(queryModuleId));
        }
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load assigned class sections.');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadAssignedClasses();
  }, [queryClassId, queryModuleId]);

  useEffect(() => {
    const fetchModulesForClass = async () => {
      if (!classId) {
        setModules([]);
        setModuleId('');
        return;
      }

      setIsLoadingModules(true);
      setError('');

      try {
        const { data } = await apiClient.get(`/content/modules/class/${classId}`);
        const loadedModules = data?.data || [];
        setModules(loadedModules);

        if (loadedModules.length === 0) {
          setModuleId('');
          return;
        }

        setModuleId((currentModuleId) => {
          if (
            currentModuleId &&
            loadedModules.some((item) => String(item.id) === String(currentModuleId))
          ) {
            return String(currentModuleId);
          }

          const hasQueryModule = loadedModules.some((item) => String(item.id) === String(queryModuleId));
          if (hasQueryModule) {
            return String(queryModuleId);
          }

          return String(loadedModules[0].id);
        });
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load modules for the selected class.');
      } finally {
        setIsLoadingModules(false);
      }
    };

    fetchModulesForClass();
  }, [classId, queryModuleId]);

  useEffect(() => {
    if (!isEditMode || !queryLessonId || !moduleId || hasLoadedEditData) {
      return undefined;
    }

    let isMounted = true;

    const loadLessonForEdit = async () => {
      setIsLoadingLesson(true);
      setError('');

      try {
        const { data } = await apiClient.get(`/content/items/module/${moduleId}`);
        const lessonItems = data?.data || [];
        const lessonItem = lessonItems.find((item) => String(item.id) === String(queryLessonId)) || null;

        if (!lessonItem) {
          throw new Error('Lesson not found for editing.');
        }

        const lessonPayload = safeParseJson(lessonItem.contentBody) || {};
        const lessonCards = Array.isArray(lessonPayload.cards) ? lessonPayload.cards : [];
        const preparedCards =
          lessonCards.length > 0
            ? lessonCards.map((card, index) => createEmptyCard(index + 1, card))
            : [createEmptyCard(1)];

        if (!isMounted) {
          return;
        }

        const resolvedTitle = String(lessonItem.title || lessonPayload.title || '').trim();
        const resolvedSequenceOrder = String(lessonItem.sequenceOrder || 1);

        setLessonTitle(resolvedTitle);
        setSequenceOrder(resolvedSequenceOrder);
        setCards(preparedCards);
        originalLessonRef.current = {
          title: resolvedTitle,
          sequenceOrder: resolvedSequenceOrder,
          cards:
            lessonCards.length > 0
              ? lessonCards.map((card) => ({
                  textContent: String(card?.textContent || ''),
                  visualTheme: normalizeTheme(card?.visualTheme),
                  imageUrl: String(card?.imageUrl || ''),
                  audioUrl: String(card?.audioUrl || '')
                }))
              : preparedCards.map(({ textContent, visualTheme, imageUrl, audioUrl }) => ({
                  textContent,
                  visualTheme,
                  imageUrl,
                  audioUrl
                }))
        };
        setHasLoadedEditData(true);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError?.response?.data?.message || loadError.message || 'Failed to load lesson for editing.');
      } finally {
        if (isMounted) {
          setIsLoadingLesson(false);
        }
      }
    };

    loadLessonForEdit();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedEditData, isEditMode, moduleId, queryLessonId]);

  const updateCard = (cardId, fieldName, value) => {
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, [fieldName]: value } : card)));
  };

  const revokePreviewUrl = (url) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  };

  const setCardAudioState = (cardId, updater) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) {
          return card;
        }

        const nextCard = typeof updater === 'function' ? updater(card) : { ...card, ...updater };
        if (card.audioPreviewUrl && card.audioPreviewUrl !== nextCard.audioPreviewUrl) {
          revokePreviewUrl(card.audioPreviewUrl);
          audioPreviewUrlsRef.current.delete(cardId);
        }

        if (nextCard.audioPreviewUrl) {
          audioPreviewUrlsRef.current.set(cardId, nextCard.audioPreviewUrl);
        }

        return nextCard;
      })
    );
  };

  const clearCardAudioPreview = (cardId) => {
    const existingUrl = audioPreviewUrlsRef.current.get(cardId);
    if (existingUrl) {
      revokePreviewUrl(existingUrl);
      audioPreviewUrlsRef.current.delete(cardId);
    }
  };

  const addCard = () => {
    setCards((prev) => [...prev, createEmptyCard(prev.length + 1)]);
  };

  const removeCard = (cardId) => {
    if (recordingCardId === cardId) {
      discardRecording(cardId);
    }

    setCards((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      clearCardAudioPreview(cardId);
      return prev.filter((card) => card.id !== cardId);
    });
  };

  const resetBuilder = () => {
    audioPreviewUrlsRef.current.forEach((url) => revokePreviewUrl(url));
    audioPreviewUrlsRef.current.clear();

    if (isEditMode && originalLessonRef.current) {
      const snapshot = originalLessonRef.current;

      setLessonTitle(snapshot.title || '');
      setSequenceOrder(snapshot.sequenceOrder || '1');
      setCards((snapshot.cards || [createEmptyCard(1)]).map((card, index) => createEmptyCard(index + 1, card)));
      setError('');
      setNotice('');
      setRecordingError('');
      setRecordingErrorCardId(null);
      return;
    }

    setLessonTitle('');
    setSequenceOrder('1');
    setCards([createEmptyCard(1)]);
    setRecordingError('');
    setRecordingErrorCardId(null);
  };

  const supportsAudioRecording = useMemo(
    () =>
      typeof window !== 'undefined' &&
      Boolean(navigator?.mediaDevices?.getUserMedia && window.MediaRecorder),
    []
  );

  const stopActiveRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  };

  const handleAudioFileChange = (cardId, file) => {
    setRecordingError('');
    setRecordingErrorCardId(null);

    if (!file) {
      setCardAudioState(cardId, (card) => ({
        ...card,
        audioFile: null,
        audioPreviewUrl: ''
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setCardAudioState(cardId, (card) => ({
      ...card,
      audioFile: file,
      audioPreviewUrl: previewUrl
    }));
  };

  const startRecording = async (cardId) => {
    if (!supportsAudioRecording) {
      setRecordingError('Audio recording is not supported in this browser.');
      setRecordingErrorCardId(cardId);
      return;
    }

    if (recordingCardId) {
      setRecordingError('Finish the current recording before starting a new one.');
      setRecordingErrorCardId(cardId);
      return;
    }

    setRecordingError('');
    setRecordingErrorCardId(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      discardRecordingRef.current = false;
      setRecordingCardId(cardId);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        const shouldDiscard = discardRecordingRef.current;

        recordingChunksRef.current = [];
        discardRecordingRef.current = false;

        if (!shouldDiscard && chunks.length > 0) {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const fileName = `lesson-audio-${Date.now()}.webm`;
          const file = new File([blob], fileName, { type: blob.type || 'audio/webm' });
          const previewUrl = URL.createObjectURL(blob);

          setCardAudioState(cardId, (card) => ({
            ...card,
            audioFile: file,
            audioPreviewUrl: previewUrl
          }));
        }

        stopActiveRecording();
        setRecordingCardId(null);
      };

      recorder.start();
    } catch (recordError) {
      setRecordingError('Microphone access was blocked. Please allow access and try again.');
      setRecordingErrorCardId(cardId);
      stopActiveRecording();
      setRecordingCardId(null);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) {
      return;
    }

    discardRecordingRef.current = false;
    stopActiveRecording();
  };

  const discardRecording = (cardId) => {
    if (recordingCardId === cardId && mediaRecorderRef.current) {
      discardRecordingRef.current = true;
      stopActiveRecording();
      setRecordingCardId(null);
      return;
    }

    setCardAudioState(cardId, (card) => ({
      ...card,
      audioFile: null,
      audioPreviewUrl: ''
    }));
  };

  const removeAudio = (cardId) => {
    setCardAudioState(cardId, (card) => ({
      ...card,
      audioFile: null,
      audioPreviewUrl: '',
      audioUrl: ''
    }));
  };

  useEffect(() => {
    return () => {
      stopActiveRecording();
      audioPreviewUrlsRef.current.forEach((url) => revokePreviewUrl(url));
      audioPreviewUrlsRef.current.clear();
    };
  }, []);

  const serializeCardForSubmit = (card, index, payload) => {
    const cardData = {
      textContent: String(card.textContent || '').trim(),
      visualTheme: normalizeTheme(card.visualTheme),
      imageUrl: String(card.imageUrl || ''),
      audioUrl: String(card.audioUrl || '')
    };

    if (card.imageFile) {
      const imageField = `image_${index}`;
      cardData.imageField = imageField;
      payload.append(imageField, card.imageFile);
    }

    if (card.audioFile) {
      const audioField = `audio_${index}`;
      cardData.audioField = audioField;
      payload.append(audioField, card.audioFile);
    }

    return cardData;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (recordingCardId) {
      setError('Stop the active audio recording before saving the lesson.');
      return;
    }

    if (!moduleId) {
      setError('Select a module before creating a lesson.');
      return;
    }

    if (!lessonTitle.trim()) {
      setError('Lesson title is required.');
      return;
    }

    const hasInvalidTextCard = cards.some((card) => !card.textContent.trim());
    if (hasInvalidTextCard) {
      setError('Each content card must include text content.');
      return;
    }

    const payload = new FormData();
    payload.append('moduleId', String(moduleId));
    payload.append('title', lessonTitle.trim());
    payload.append('sequenceOrder', String(sequenceOrder || '1'));

    const cardsPayload = cards.map((card, index) => serializeCardForSubmit(card, index, payload));
    payload.append('cards', JSON.stringify(cardsPayload));

    setIsSubmitting(true);

    try {
      const request = isEditMode
        ? apiClient.put(`/content/lesson/${queryLessonId}`, payload, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
        : apiClient.post('/content/lesson', payload, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

      const { data } = await request;
      const savedLessonId = data?.lessonId || data?.data?.id || queryLessonId;

      setNotice(
        isEditMode
          ? `Lesson updated successfully. Lesson ID: ${savedLessonId}`
          : `Lesson created successfully. Lesson ID: ${savedLessonId}`
      );

      if (isEditMode) {
        const savedPayload = safeParseJson(data?.data?.contentBody) || {};
        const savedCards = Array.isArray(savedPayload.cards) ? savedPayload.cards : cardsPayload;
        const preparedSavedCards =
          savedCards.length > 0
            ? savedCards.map((card, index) => createEmptyCard(index + 1, card))
            : [createEmptyCard(1)];

        setCards(preparedSavedCards);
        originalLessonRef.current = {
          title: String(data?.data?.title || lessonTitle || '').trim(),
          sequenceOrder: String(data?.data?.sequenceOrder || sequenceOrder || '1'),
          cards: savedCards.map((card) => ({
            textContent: String(card?.textContent || ''),
            visualTheme: normalizeTheme(card?.visualTheme),
            imageUrl: String(card?.imageUrl || ''),
            audioUrl: String(card?.audioUrl || '')
          }))
        };
      } else {
        resetBuilder();
      }
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Failed to create lesson. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLockedForEdit = isEditMode;
  const moduleLabel = selectedModule?.title || 'No module selected';

  return (
    <section className="space-y-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            {isEditMode ? 'Edit Immersive Lesson' : 'Immersive Lesson Builder'}
          </h1>
          <p className="mt-2 text-gray-600">
            {isEditMode
              ? 'Edit the existing lesson cards, media, and ordering without flattening the lesson payload.'
              : 'Create rich, themed lessons by stacking dynamic content cards.'}
          </p>
        </div>

        {isEditMode && (
          <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
            Editing lesson ID {queryLessonId}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="classId" className="mb-2 block text-sm font-semibold text-gray-700">
              Class Section
            </label>
            <select
              id="classId"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
              disabled={isLoadingClasses || assignedClasses.length === 0 || isLockedForEdit}
            >
              {assignedClasses.length === 0 ? (
                <option value="">No assigned classes</option>
              ) : (
                assignedClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} {classItem.gradeLevel ? `(${classItem.gradeLevel})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="moduleId" className="mb-2 block text-sm font-semibold text-gray-700">
              Target Module
            </label>
            <select
              id="moduleId"
              value={moduleId}
              onChange={(event) => setModuleId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
              disabled={isLoadingModules || modules.length === 0 || isLoadingLesson || isLockedForEdit}
            >
              {modules.length === 0 ? (
                <option value="">No modules available for this class</option>
              ) : (
                modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="lessonTitle" className="mb-2 block text-sm font-semibold text-gray-700">
              Lesson Title
            </label>
            <input
              id="lessonTitle"
              type="text"
              value={lessonTitle}
              onChange={(event) => setLessonTitle(event.target.value)}
              placeholder="Example: Journey Through the Solar System"
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
              required
            />
          </div>

          <div>
            <label htmlFor="sequenceOrder" className="mb-2 block text-sm font-semibold text-gray-700">
              Sequence Order
            </label>
            <input
              id="sequenceOrder"
              type="number"
              min="1"
              value={sequenceOrder}
              onChange={(event) => setSequenceOrder(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>
        </div>

        {isEditMode && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This lesson stays attached to the current module while editing so the card structure remains intact.
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Content Cards</h2>
          <button type="button" onClick={addCard} className="btn-secondary">
            Add Card
          </button>
        </div>

        {isLoadingLesson && isEditMode && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            Loading lesson cards for editing...
          </div>
        )}

        <div className="mt-4 space-y-4">
          {cards.map((card, index) => (
            <article key={card.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Card {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeCard(card.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                  disabled={cards.length <= 1}
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Text Content</label>
                  <textarea
                    value={card.textContent}
                    onChange={(event) => updateCard(card.id, 'textContent', event.target.value)}
                    rows={3}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3"
                    placeholder="Write the instructional text for this card"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Visual Theme</label>
                  <select
                    value={card.visualTheme}
                    onChange={(event) => updateCard(card.id, 'visualTheme', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3"
                  >
                    {themeOptions.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Optional Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => updateCard(card.id, 'imageFile', event.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                  {card.imageFile ? (
                    <p className="mt-1 text-xs text-gray-500">Selected: {card.imageFile.name}</p>
                  ) : card.imageUrl ? (
                    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
                      <img
                        src={resolveMediaUrl(card.imageUrl)}
                        alt="Current card media"
                        className="h-32 w-full object-cover"
                      />
                      <p className="border-t border-gray-200 px-3 py-2 text-xs text-gray-500">
                        Current image attached
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">No image selected</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Optional Audio</label>
                  <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Record audio</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startRecording(card.id)}
                        disabled={!supportsAudioRecording || Boolean(recordingCardId) || isSubmitting}
                        className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Start Recording
                      </button>
                      <button
                        type="button"
                        onClick={stopRecording}
                        disabled={recordingCardId !== card.id || isSubmitting}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => discardRecording(card.id)}
                        disabled={(!card.audioPreviewUrl && !card.audioFile) || isSubmitting}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Discard New Audio
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAudio(card.id)}
                        disabled={(!card.audioUrl && !card.audioPreviewUrl && !card.audioFile) || isSubmitting}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove Audio
                      </button>
                    </div>
                    {!supportsAudioRecording && (
                      <p className="mt-2 text-xs text-gray-500">
                        Recording is not supported in this browser.
                      </p>
                    )}
                    {recordingCardId === card.id && (
                      <p className="mt-2 text-xs font-semibold text-amber-700">Recording in progress...</p>
                    )}
                    {recordingError && recordingErrorCardId === card.id && (
                      <p className="mt-2 text-xs text-red-600">{recordingError}</p>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => handleAudioFileChange(card.id, event.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    disabled={isSubmitting || (recordingCardId && recordingCardId !== card.id)}
                  />
                  {card.audioPreviewUrl ? (
                    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
                      <audio controls className="w-full" src={card.audioPreviewUrl} />
                      <p className="mt-2 text-xs text-gray-500">Audio ready to upload</p>
                    </div>
                  ) : card.audioFile ? (
                    <p className="mt-1 text-xs text-gray-500">Selected: {card.audioFile.name}</p>
                  ) : card.audioUrl ? (
                    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
                      <audio controls className="w-full" src={resolveMediaUrl(card.audioUrl)} />
                      <p className="mt-2 text-xs text-gray-500">Current audio attached</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">No audio selected</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 border-t pt-4">
          <p className="mb-4 text-sm text-gray-600">
            {isEditMode ? 'Editing' : 'Creating'} in module:{' '}
            <span className="font-semibold text-gray-900">{moduleLabel}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !moduleId || isLoadingClasses || isLoadingModules || isLoadingLesson}
            >
              {isSubmitting
                ? isEditMode
                  ? 'Updating Lesson...'
                  : 'Saving Lesson...'
                : isEditMode
                ? 'Update Lesson'
                : 'Save Lesson'}
            </button>
            <button type="button" onClick={resetBuilder} className="btn-secondary" disabled={isSubmitting}>
              Reset Form
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default LessonBuilder;
