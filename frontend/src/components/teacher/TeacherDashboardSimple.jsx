import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';

/**
 * Teacher dashboard overview and class quick actions.
 */

function TeacherDashboardSimple() {
  const navigate = useNavigate();
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAssignedClasses = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await apiClient.get('/content/teacher/classes');
        setAssignedClasses(response.data?.data || []);
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load your assigned class sections.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAssignedClasses();
  }, []);

  const summary = useMemo(() => {
    const totalModules = assignedClasses.reduce((sum, classItem) => sum + (classItem.modules?.length || 0), 0);
    const uniqueTeachers = new Set(
      assignedClasses.flatMap((classItem) => (classItem.assignedTeachers || []).map((teacher) => teacher.id))
    );

    return {
      classSections: assignedClasses.length,
      modules: totalModules,
      collaboratingTeachers: uniqueTeachers.size
    };
  }, [assignedClasses]);

  const handleGoToContent = (classId) => {
    localStorage.setItem('teacherClassId', String(classId));
    navigate(`/teacher/content?classId=${classId}`);
  };

  const handleGoToAnalytics = (classId) => {
    localStorage.setItem('teacherClassId', String(classId));
    navigate(`/teacher/analytics?classId=${classId}`);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Teacher Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Manage class content, track progress, and review reports.
        </p>
      </div>

      <div>
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-600">Loading assigned class sections...</p>
          </div>
        ) : assignedClasses.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800">No Class Sections Assigned</h2>
            <p className="mt-2 text-gray-600">
              Ask the admin to assign you to one or more classes from the Course Assignment panel.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-primary-100">
                <p className="text-sm text-gray-500">Assigned Class Sections</p>
                <p className="mt-2 text-3xl font-bold text-primary-700">{summary.classSections}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-success-100">
                <p className="text-sm text-gray-500">Available Modules</p>
                <p className="mt-2 text-3xl font-bold text-success-700">{summary.modules}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-secondary-100">
                <p className="text-sm text-gray-500">Co-Teachers Assigned</p>
                <p className="mt-2 text-3xl font-bold text-secondary-700">{summary.collaboratingTeachers}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignedClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-primary-200"
                >
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{classItem.name}</h3>
                    <p className="text-sm text-gray-600">{classItem.gradeLevel || 'Grade level not set'}</p>
                  </div>

                  <div className="mb-4 rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assigned Modules</p>
                    {classItem.modules?.length > 0 ? (
                      <div className="mt-2 text-sm text-gray-700">
                        {classItem.modules.map((module) => module.title).join(', ')}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-500">No modules assigned yet.</div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleGoToContent(classItem.id)}
                      className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                    >
                      Manage Content
                    </button>
                    <button
                      onClick={() => handleGoToAnalytics(classItem.id)}
                      className="rounded-xl bg-success-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-success-700"
                    >
                      View Analytics
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default TeacherDashboardSimple;
