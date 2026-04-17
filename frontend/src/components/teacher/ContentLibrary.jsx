/**
 * ContentLibrary Component
 * Displays a data table of modules with their details
 */
function ContentLibrary({
  modules,
  onCreateQuiz,
  onCreateLesson,
  onEditModule,
  onDeleteModule,
  onManageContent,
  onToggleModuleLock,
  onToggleQuizLock,
  lockBusyMap = {}
}) {
  if (!modules || modules.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500 text-lg">No modules found. Create your first module!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">Content Library</h2>
        <p className="text-gray-600 mt-1">Manage your courses and modules</p>
      </div>

      <div className="p-6">
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
        >
          {modules.map((module) => {
            const quizItems = (module.items || []).filter((item) => item.itemType === 'Quiz');

            return (
              <article
                key={module.id}
                className="flex h-full flex-col rounded-xl border border-gray-200 bg-gray-50 p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="truncate text-lg font-bold text-gray-900" title={module.title}>
                    {module.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800">
                    {module.items?.length || 0} items
                  </span>
                </div>

                <p
                  className="truncate-3 mb-4 min-h-[3.75rem] text-sm text-gray-600"
                  title={module.description || 'No description'}
                >
                  {module.description || 'No description'}
                </p>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(module.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Module Lock
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={!module.isLocked}
                      disabled={!onToggleModuleLock || Boolean(lockBusyMap[`module-${module.id}`])}
                      onChange={(event) => onToggleModuleLock?.(module, !event.target.checked)}
                    />
                    <span
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        module.isLocked ? 'bg-gray-300' : 'bg-emerald-500'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          module.isLocked ? 'translate-x-1' : 'translate-x-5'
                        }`}
                      />
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      {module.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                  </label>
                </div>

                <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Quiz Locks
                  </div>

                  {quizItems.length > 0 ? (
                    <div className="space-y-2">
                      {quizItems.map((quizItem) => (
                        <div key={quizItem.id} className="flex items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={!quizItem.isLocked}
                              disabled={!onToggleQuizLock || Boolean(lockBusyMap[`item-${quizItem.id}`])}
                              onChange={(event) =>
                                onToggleQuizLock?.(quizItem, !event.target.checked)
                              }
                            />
                            <span
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                                quizItem.isLocked ? 'bg-gray-300' : 'bg-emerald-500'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  quizItem.isLocked ? 'translate-x-1' : 'translate-x-4'
                                }`}
                              />
                            </span>
                          </label>

                          <span className="truncate text-xs font-medium text-gray-700" title={quizItem.title}>
                            {quizItem.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">No quizzes</span>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-200 pt-4 text-sm font-semibold">
                  <button
                    onClick={() => onCreateLesson(module)}
                    className="rounded-md bg-purple-50 px-3 py-1.5 text-purple-700 transition-colors hover:bg-purple-100"
                  >
                    Build Lesson
                  </button>
                  <button
                    onClick={() => onCreateQuiz(module)}
                    className="rounded-md bg-blue-50 px-3 py-1.5 text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Add Quiz
                  </button>
                  <button
                    onClick={() => onManageContent(module)}
                    className="rounded-md bg-indigo-50 px-3 py-1.5 text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    Manage Items
                  </button>
                  <button
                    onClick={() => onEditModule(module)}
                    className="rounded-md bg-emerald-50 px-3 py-1.5 text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteModule(module.id)}
                    className="rounded-md bg-red-50 px-3 py-1.5 text-red-700 transition-colors hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ContentLibrary;
