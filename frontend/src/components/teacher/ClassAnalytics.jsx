import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchTeacherAnalytics, fetchTeacherAssignedClasses } from '../../services/teacherService';

const LOW_SCORE_THRESHOLD = 50;

function ClassAnalytics() {
  const location = useLocation();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [analytics, setAnalytics] = useState({
    summary: {
      totalStudentsInAssignedClasses: 0,
      averageClassXP: 0
    },
    classes: [],
    roster: []
  });
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const initialize = async () => {
      setIsLoadingClasses(true);
      setError('');

      try {
        const classRows = await fetchTeacherAssignedClasses();
        setClasses(classRows);

        const queryClassId = new URLSearchParams(location.search).get('classId');
        const rememberedClassId = localStorage.getItem('teacherClassId');
        const preferredClassId = queryClassId || rememberedClassId;

        if (classRows.length === 0) {
          setSelectedClassId('');
          return;
        }

        const preferredExists = classRows.some((item) => String(item.id) === String(preferredClassId));
        const resolvedClassId = preferredExists ? String(preferredClassId) : String(classRows[0].id);

        setSelectedClassId(resolvedClassId);
        localStorage.setItem('teacherClassId', resolvedClassId);
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Failed to load assigned classes.');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    initialize();
  }, [location.search]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!selectedClassId) {
        setAnalytics({
          summary: {
            totalStudentsInAssignedClasses: 0,
            averageClassXP: 0
          },
          classes: [],
          roster: []
        });
        setIsLoadingAnalytics(false);
        return;
      }

      setIsLoadingAnalytics(true);
      setError('');

      try {
        const payload = await fetchTeacherAnalytics(selectedClassId);
        setAnalytics(payload);
      } catch (analyticsError) {
        setError(analyticsError?.response?.data?.message || 'Failed to load analytics data.');
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    loadAnalytics();
  }, [selectedClassId, refreshToken]);

  const selectedClass = useMemo(
    () => classes.find((item) => String(item.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  );

  const lowScoreCount = useMemo(
    () =>
      (analytics.roster || []).filter((row) => {
        if (row.latestQuizScore === null || row.latestQuizScore === undefined) {
          return false;
        }

        return Number(row.latestQuizScore) < LOW_SCORE_THRESHOLD;
      }).length,
    [analytics.roster]
  );

  const handleClassChange = (nextClassId) => {
    setSelectedClassId(nextClassId);
    localStorage.setItem('teacherClassId', String(nextClassId));
  };

  return (
    <section className="space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📊 Class Analytics Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Live roster and performance insights for your assigned classes
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Class Section
              </label>
              <select
                value={selectedClassId}
                onChange={(event) => handleClassChange(event.target.value)}
                disabled={isLoadingClasses || classes.length === 0}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                {classes.length === 0 ? (
                  <option value="">No assigned class sections</option>
                ) : (
                  classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} {classItem.gradeLevel ? `(${classItem.gradeLevel})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setRefreshToken((value) => value + 1)}
                className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
                disabled={!selectedClassId || isLoadingAnalytics}
              >
                {isLoadingAnalytics ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-200">
            <div className="text-primary-500 text-3xl mb-2">👥</div>
            <div className="text-3xl font-bold text-gray-800">{analytics.summary?.totalStudentsInAssignedClasses || 0}</div>
            <div className="text-gray-600">Total Students in Assigned Classes</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-success-200">
            <div className="text-success-500 text-3xl mb-2">📈</div>
            <div className="text-3xl font-bold text-gray-800">{Number(analytics.summary?.averageClassXP || 0).toFixed(1)}</div>
            <div className="text-gray-600">Average Class XP</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-secondary-200">
            <div className="text-secondary-500 text-3xl mb-2">🏫</div>
            <div className="text-3xl font-bold text-gray-800">{selectedClass?.name || '—'}</div>
            <div className="text-gray-600">Selected Class</div>
          </div>

          <div className="bg-red-100 rounded-2xl shadow-lg p-6 border-2 border-red-400">
            <div className="text-red-500 text-3xl mb-2">⚠️</div>
            <div className="text-3xl font-bold text-red-700">{lowScoreCount}</div>
            <div className="text-red-700 font-semibold">Students with Low Latest Quiz Score</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">📋 Class Roster & Progress</h2>
          <p className="mb-6 text-sm text-gray-600">
            Every student in {selectedClass?.name || 'the selected class'}, including level, total XP, and latest quiz score.
          </p>

          {isLoadingAnalytics ? (
            <div className="flex h-52 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : (analytics.roster || []).length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm font-semibold text-gray-600">
              No students found in this class yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total XP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Latest Quiz Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Latest Quiz Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(analytics.roster || []).map((row) => {
                    const latestScore = row.latestQuizScore;
                    const hasScore = latestScore !== null && latestScore !== undefined;
                    const isLowScore = hasScore && Number(latestScore) < LOW_SCORE_THRESHOLD;

                    return (
                      <tr key={row.studentId}>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.fullName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.level}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.totalXP}</td>
                        <td
                          className={`px-4 py-3 text-sm font-semibold ${
                            isLowScore ? 'text-red-600' : 'text-gray-700'
                          }`}
                        >
                          {hasScore ? `${Number(latestScore).toFixed(2)}%` : 'No quiz yet'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {row.latestQuizAt ? new Date(row.latestQuizAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </section>
  );
}

export default ClassAnalytics;
