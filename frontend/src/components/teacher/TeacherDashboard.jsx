import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ContentLibrary from './ContentLibrary';
import apiClient from '../../services/apiClient';
import { updateContentLock } from '../../services/teacherService';

/**
 * TeacherDashboard Component
 * Clean, structured layout for teachers to manage content
 */
function TeacherDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedModuleForItems, setSelectedModuleForItems] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [classId, setClassId] = useState('');
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    totalQuestions: 10
  });
  const [moduleEditId, setModuleEditId] = useState(null);
  const [itemForm, setItemForm] = useState({
    title: '',
    itemType: 'Article',
    contentBody: '',
    contentUrl: '',
    sequenceOrder: 1
  });
  const [itemEditId, setItemEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [lockBusyMap, setLockBusyMap] = useState({});
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');

  const safeParseJson = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const isLessonContentItem = (item) => {
    if (!item) return false;

    if (item.itemType === 'Lesson') {
      return true;
    }

    const parsedBody = safeParseJson(item.contentBody);
    return parsedBody?.lessonType === 'ImmersiveLesson';
  };

  const selectedClass = useMemo(
    () => assignedClasses.find((item) => String(item.id) === String(classId)) || null,
    [assignedClasses, classId]
  );

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryClassId = queryParams.get('classId');
    const savedClassId = localStorage.getItem('teacherClassId');
    const preferredClassId = queryClassId || savedClassId;

    const loadAssignedClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const { data } = await apiClient.get('/content/teacher/classes');
        const classList = data?.data || [];
        setAssignedClasses(classList);

        if (classList.length === 0) {
          setClassId('');
          setModules([]);
          setError('No class sections assigned to your account yet.');
          return;
        }

        const hasPreferredClass = classList.some((classItem) => String(classItem.id) === String(preferredClassId));
        const resolvedClassId = hasPreferredClass ? String(preferredClassId) : String(classList[0].id);
        setClassId(resolvedClassId);
        localStorage.setItem('teacherClassId', resolvedClassId);
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load assigned classes.');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadAssignedClasses();
  }, [location.search]);

  const fetchModules = async (targetClassId = classId) => {
    if (!targetClassId) {
      setModules([]);
      setError('Select a class section to load modules.');
      return;
    }

    const isAssignedClass = assignedClasses.some((classItem) => String(classItem.id) === String(targetClassId));
    if (!isAssignedClass) {
      setModules([]);
      setError('You can only load modules for class sections assigned to you.');
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await apiClient.get(`/content/modules/class/${targetClassId}`);
      setModules(data?.data || []);
      localStorage.setItem('teacherClassId', String(targetClassId));
      setError(null);
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError('Failed to load modules. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoadingClasses && classId) {
      fetchModules(classId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingClasses, classId]);

  const fetchModuleItems = async (moduleId) => {
    try {
      const { data } = await apiClient.get(`/content/items/module/${moduleId}`);
      setContentItems(data?.data || []);
    } catch (err) {
      console.error('Error fetching content items:', err);
      setError('Failed to load content items.');
    }
  };

  const markLockBusy = (key, isBusy) => {
    setLockBusyMap((prev) => ({
      ...prev,
      [key]: isBusy
    }));
  };

  const handleToggleModuleLock = async (module, isLocked) => {
    if (!module?.id) return;

    const busyKey = `module-${module.id}`;
    markLockBusy(busyKey, true);
    setError(null);
    setNotice('');

    try {
      await updateContentLock({
        id: module.id,
        entityType: 'module',
        isLocked
      });

      setNotice(`Module "${module.title}" is now ${isLocked ? 'locked' : 'unlocked'}.`);
      await fetchModules(classId);
      if (selectedModuleForItems?.id === module.id) {
        await fetchModuleItems(module.id);
      }
    } catch (lockError) {
      setError(lockError?.response?.data?.message || 'Failed to update module lock state.');
    } finally {
      markLockBusy(busyKey, false);
    }
  };

  const handleToggleQuizLock = async (quizItem, isLocked) => {
    if (!quizItem?.id) return;

    const busyKey = `item-${quizItem.id}`;
    markLockBusy(busyKey, true);
    setError(null);
    setNotice('');

    try {
      await updateContentLock({
        id: quizItem.id,
        entityType: 'item',
        isLocked
      });

      setNotice(`Quiz "${quizItem.title}" is now ${isLocked ? 'locked' : 'unlocked'}.`);
      await fetchModules(classId);

      const targetModuleId = selectedModuleForItems?.id || quizItem.moduleId;
      if (targetModuleId) {
        await fetchModuleItems(targetModuleId);
      }
    } catch (lockError) {
      setError(lockError?.response?.data?.message || 'Failed to update quiz lock state.');
    } finally {
      markLockBusy(busyKey, false);
    }
  };

  const resetModuleForm = () => {
    setModuleForm({
      title: '',
      description: '',
      totalQuestions: 10
    });
    setModuleEditId(null);
  };

  const resetItemForm = () => {
    setItemForm({
      title: '',
      itemType: 'Article',
      contentBody: '',
      contentUrl: '',
      sequenceOrder: 1
    });
    setItemEditId(null);
  };

  const handleCreateQuiz = (module) => {
    if (!module?.id) {
      setError('Choose a module before creating a quiz.');
      return;
    }

    const params = new URLSearchParams({
      moduleId: String(module.id),
      classId: String(classId || module.classId || '')
    });

    navigate(`/teacher/quiz/create?${params.toString()}`);
  };

  const handleCreateLesson = (module) => {
    if (!module?.id) {
      return;
    }

    const params = new URLSearchParams({
      moduleId: String(module.id),
      classId: String(classId || module.classId || '')
    });

    navigate(`/teacher/lesson/create?${params.toString()}`);
  };

  const handleSaveModule = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice('');

    if (!classId) {
      setError('Select a class section before creating a module.');
      return;
    }

    try {
      if (moduleEditId) {
        await apiClient.put(`/content/modules/${moduleEditId}`, {
          title: moduleForm.title,
          description: moduleForm.description
        });
        setNotice('Module updated successfully.');
      } else {
        await apiClient.post('/content/modules', {
          classId: Number(classId),
          title: moduleForm.title,
          description: moduleForm.description,
          totalQuestions: Number(moduleForm.totalQuestions) || 10
        });
        setNotice('Module created. Gamification was generated automatically.');
      }

      resetModuleForm();
      await fetchModules();
    } catch (err) {
      console.error('Error saving module:', err);
      setError(err?.response?.data?.message || 'Failed to save module.');
    }
  };

  const handleEditModule = (module) => {
    setModuleEditId(module.id);
    setModuleForm({
      title: module.title || '',
      description: module.description || '',
      totalQuestions: 10
    });
  };

  const handleDeleteModule = async (moduleId) => {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/content/modules/${moduleId}`);

      setNotice('Module deleted successfully.');
      await fetchModules();
      if (selectedModuleForItems?.id === moduleId) {
        setSelectedModuleForItems(null);
        setContentItems([]);
      }
    } catch (err) {
      console.error('Error deleting module:', err);
      setError('Failed to delete module. Please try again.');
    }
  };

  const handleManageContent = async (module) => {
    setSelectedModuleForItems(module);
    resetItemForm();
    await fetchModuleItems(module.id);
  };

  const handleSaveContentItem = async (e) => {
    e.preventDefault();
    if (!selectedModuleForItems) {
      setError('Choose a module first to manage content items.');
      return;
    }

    try {
      const payload = {
        moduleId: selectedModuleForItems.id,
        title: itemForm.title,
        itemType: itemForm.itemType,
        contentBody: itemForm.contentBody,
        contentUrl: itemForm.contentUrl,
        sequenceOrder: Number(itemForm.sequenceOrder) || 1
      };

      if (itemEditId) {
        await apiClient.put(`/content/items/${itemEditId}`, payload);
        setNotice('Content item updated successfully.');
      } else {
        await apiClient.post('/content/items', payload);
        setNotice('Content item created successfully.');
      }

      resetItemForm();
      await fetchModuleItems(selectedModuleForItems.id);
      await fetchModules();
    } catch (err) {
      console.error('Error saving content item:', err);
      setError(err?.response?.data?.message || 'Failed to save content item.');
    }
  };

  const handleEditContentItem = (item) => {
    if (isLessonContentItem(item)) {
      const params = new URLSearchParams({
        mode: 'edit',
        lessonId: String(item.id),
        moduleId: String(item.moduleId || selectedModuleForItems?.id || ''),
        classId: String(classId || selectedModuleForItems?.classId || '')
      });

      navigate(`/teacher/lesson/create?${params.toString()}`);
      return;
    }

    setItemEditId(item.id);
    setItemForm({
      title: item.title || '',
      itemType: item.itemType || 'Article',
      contentBody: item.contentBody || '',
      contentUrl: item.contentUrl || '',
      sequenceOrder: item.sequenceOrder || 1
    });
  };

  const handleEditQuizItem = (item) => {
    const routeParams = new URLSearchParams({
      mode: 'edit',
      quizId: String(item.id),
      moduleId: String(selectedModuleForItems?.id || item.moduleId || ''),
      classId: String(classId || selectedModuleForItems?.classId || '')
    });

    navigate(`/teacher/quiz/create?${routeParams.toString()}`);
  };

  const handleDeleteContentItem = async (itemId) => {
    if (!confirm('Delete this content item?')) {
      return;
    }

    try {
      await apiClient.delete(`/content/items/${itemId}`);
      setNotice('Content item deleted.');
      if (selectedModuleForItems) {
        await fetchModuleItems(selectedModuleForItems.id);
      }
      await fetchModules();
    } catch (err) {
      console.error('Error deleting content item:', err);
      setError('Failed to delete content item.');
    }
  };

  return (
    <section className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Content Manager</h1>
          <p className="text-gray-600">Manage modules and content items with live backend CRUD.</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            disabled={isLoadingClasses || assignedClasses.length === 0}
          >
            {assignedClasses.length === 0 ? (
              <option value="">No assigned class sections</option>
            ) : (
              assignedClasses.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} {classItem.gradeLevel ? `(${classItem.gradeLevel})` : ''}
                </option>
              ))
            )}
          </select>
          <button type="button" onClick={() => fetchModules(classId)} className="btn-primary" disabled={!classId}>
            Refresh Modules
          </button>
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

        {!isLoadingClasses && assignedClasses.length === 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            You are not assigned to any class sections yet. Ask an Admin to assign classes from the Admin Dashboard.
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Modules</p>
                <p className="text-3xl font-bold text-primary-600 mt-2">{modules.length}</p>
              </div>
              <div className="text-4xl">📚</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                <p className="text-3xl font-bold text-success-600 mt-2">
                  {modules.reduce((sum, m) => sum + (m.items?.filter(i => i.itemType === 'Quiz').length || 0), 0)}
                </p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assigned Class Sections</p>
                <p className="text-3xl font-bold text-accent-600 mt-2">{assignedClasses.length}</p>
              </div>
              <div className="text-4xl">🏫</div>
            </div>
          </div>
        </div>

        {/* Module Form */}
        <form onSubmit={handleSaveModule} className="bg-white rounded-lg shadow-md p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={moduleForm.title}
            onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Module title"
            className="px-4 py-3 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="number"
            min="1"
            value={moduleForm.totalQuestions}
            onChange={(e) => setModuleForm(prev => ({ ...prev, totalQuestions: e.target.value }))}
            placeholder="Estimated total questions"
            className="px-4 py-3 border border-gray-300 rounded-lg"
            disabled={Boolean(moduleEditId)}
          />
          <textarea
            value={moduleForm.description}
            onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Module description"
            className="md:col-span-2 px-4 py-3 border border-gray-300 rounded-lg"
            rows="3"
          />
          <div className="md:col-span-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Creating in class: <span className="font-semibold">{selectedClass?.name || 'No class selected'}</span>
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" className="btn-primary">
              {moduleEditId ? 'Update Module' : 'Create Module'}
            </button>
            {moduleEditId && (
              <button type="button" onClick={resetModuleForm} className="btn-secondary">
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        {/* Content Library */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading modules...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button onClick={() => fetchModules(classId)} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : (
          <ContentLibrary
            modules={modules}
            onCreateQuiz={handleCreateQuiz}
            onCreateLesson={handleCreateLesson}
            onEditModule={handleEditModule}
            onDeleteModule={handleDeleteModule}
            onManageContent={handleManageContent}
            onToggleModuleLock={handleToggleModuleLock}
            onToggleQuizLock={handleToggleQuizLock}
            lockBusyMap={lockBusyMap}
          />
        )}

        {/* Content Item CRUD */}
        {selectedModuleForItems && (
          <section className="mt-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Manage Content Items</h2>
              <p className="text-gray-600 mb-4">
                Module: <span className="font-semibold">{selectedModuleForItems.title}</span>
              </p>

              <form onSubmit={handleSaveContentItem} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Content item title"
                  className="px-4 py-3 border border-gray-300 rounded-lg"
                  required
                />
                <select
                  value={itemForm.itemType}
                  onChange={(e) => setItemForm(prev => ({ ...prev, itemType: e.target.value }))}
                  className="px-4 py-3 border border-gray-300 rounded-lg"
                >
                  <option value="Article">Article</option>
                  <option value="Video">Video</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Lesson">Lesson</option>
                </select>
                <input
                  type="url"
                  value={itemForm.contentUrl}
                  onChange={(e) => setItemForm(prev => ({ ...prev, contentUrl: e.target.value }))}
                  placeholder="Content URL (optional)"
                  className="px-4 py-3 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  min="1"
                  value={itemForm.sequenceOrder}
                  onChange={(e) => setItemForm(prev => ({ ...prev, sequenceOrder: e.target.value }))}
                  placeholder="Sequence order"
                  className="px-4 py-3 border border-gray-300 rounded-lg"
                />
                <textarea
                  value={itemForm.contentBody}
                  onChange={(e) => setItemForm(prev => ({ ...prev, contentBody: e.target.value }))}
                  placeholder="Content body"
                  className="md:col-span-2 px-4 py-3 border border-gray-300 rounded-lg"
                  rows="3"
                />
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="btn-primary">
                    {itemEditId ? 'Update Item' : 'Create Item'}
                  </button>
                  {itemEditId && (
                    <button type="button" onClick={resetItemForm} className="btn-secondary">
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              {contentItems.length === 0 ? (
                <p className="text-gray-500">No content items found for this module.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Visibility</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {contentItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-800">{item.title}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.itemType}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.sequenceOrder}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {item.itemType === 'Quiz' ? (
                              <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={!item.isLocked}
                                  disabled={Boolean(lockBusyMap[`item-${item.id}`])}
                                  onChange={(event) => handleToggleQuizLock(item, !event.target.checked)}
                                />
                                <span
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                                    item.isLocked ? 'bg-gray-300' : 'bg-emerald-500'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                      item.isLocked ? 'translate-x-1' : 'translate-x-4'
                                    }`}
                                  />
                                </span>
                                <span className="text-xs font-semibold text-gray-700">
                                  {item.isLocked ? 'Locked' : 'Unlocked'}
                                </span>
                              </label>
                            ) : (
                              <span className="text-xs text-gray-400">Not Applicable</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            <button
                              type="button"
                              onClick={() =>
                                item.itemType === 'Quiz'
                                  ? handleEditQuizItem(item)
                                  : handleEditContentItem(item)
                              }
                              className="text-primary-600 hover:text-primary-800 mr-4"
                            >
                              {item.itemType === 'Quiz'
                                ? 'Edit Quiz'
                                : isLessonContentItem(item)
                                ? 'Edit Lesson'
                                : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleDeleteContentItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
    </section>
  );
}

export default TeacherDashboard;
