import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../../services/apiClient';

const themeOptions = ['Space', 'Nature', 'Lab'];

const createEmptyCard = (seed = 0) => ({
  id: `${Date.now()}-${Math.random()}-${seed}`,
  textContent: '',
  visualTheme: 'Space',
  imageFile: null,
  audioFile: null
});

function LessonBuilder() {
  const location = useLocation();

  const [assignedClasses, setAssignedClasses] = useState([]);
  const [modules, setModules] = useState([]);
  const [classId, setClassId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState('1');
  const [cards, setCards] = useState([createEmptyCard(1)]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedModule = useMemo(
    () => modules.find((module) => String(module.id) === String(moduleId)) || null,
    [modules, moduleId]
  );

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const classIdFromQuery = query.get('classId');
    const moduleIdFromQuery = query.get('moduleId');

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

        const hasQueryClass = classList.some((item) => String(item.id) === String(classIdFromQuery));
        const resolvedClassId = hasQueryClass ? String(classIdFromQuery) : String(classList[0].id);
        setClassId(resolvedClassId);

        if (moduleIdFromQuery) {
          setModuleId(String(moduleIdFromQuery));
        }
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load assigned class sections.');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadAssignedClasses();
  }, [location.search]);

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

        const hasSelectedModule = loadedModules.some((item) => String(item.id) === String(moduleId));
        if (!hasSelectedModule) {
          setModuleId(String(loadedModules[0].id));
        }
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load modules for the selected class.');
      } finally {
        setIsLoadingModules(false);
      }
    };

    fetchModulesForClass();
  }, [classId]);

  const updateCard = (cardId, fieldName, value) => {
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, [fieldName]: value } : card)));
  };

  const addCard = () => {
    setCards((prev) => [...prev, createEmptyCard(prev.length + 1)]);
  };

  const removeCard = (cardId) => {
    setCards((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((card) => card.id !== cardId);
    });
  };

  const resetBuilder = () => {
    setLessonTitle('');
    setSequenceOrder('1');
    setCards([createEmptyCard(1)]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

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

    const cardsPayload = cards.map((card, index) => {
      const cardData = {
        textContent: card.textContent.trim(),
        visualTheme: card.visualTheme
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
    });

    payload.append('cards', JSON.stringify(cardsPayload));

    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post('/content/lesson', payload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setNotice(`Lesson created successfully. Lesson ID: ${data?.lessonId || data?.data?.id}`);
      resetBuilder();
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Failed to create lesson. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Immersive Lesson Builder</h1>
            <p className="mt-2 text-gray-600">Create rich, themed lessons by stacking dynamic content cards.</p>
          </div>
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
                disabled={isLoadingClasses || assignedClasses.length === 0}
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
                disabled={isLoadingModules || modules.length === 0}
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

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Content Cards</h2>
            <button type="button" onClick={addCard} className="btn-secondary">
              Add Card
            </button>
          </div>

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
                    <p className="mt-1 text-xs text-gray-500">{card.imageFile ? card.imageFile.name : 'No image selected'}</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Optional Audio</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(event) => updateCard(card.id, 'audioFile', event.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">{card.audioFile ? card.audioFile.name : 'No audio selected'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 border-t pt-4">
            <p className="mb-4 text-sm text-gray-600">
              Creating in module: <span className="font-semibold text-gray-900">{selectedModule?.title || 'No module selected'}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={isSubmitting || !moduleId || isLoadingClasses || isLoadingModules}>
                {isSubmitting ? 'Saving Lesson...' : 'Save Lesson'}
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
