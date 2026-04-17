import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { clearAuthSession } from '../../services/authStorage';

const USER_PAGE_LIMIT = 20;

function parseImportSummaryHeader(headers) {
  const summaryHeader = headers?.['x-import-summary'];
  if (!summaryHeader) return null;

  try {
    return JSON.parse(summaryHeader);
  } catch {
    return null;
  }
}

function getFileNameFromDisposition(disposition) {
  if (!disposition) return `bulk-user-credentials-${Date.now()}.pdf`;

  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || `bulk-user-credentials-${Date.now()}.pdf`;
}

async function extractApiErrorMessage(error, fallbackMessage) {
  const responseData = error?.response?.data;

  if (typeof Blob !== 'undefined' && responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text);
      return parsed?.message || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }

  return error?.response?.data?.message || fallbackMessage;
}

function toggleInArray(values, id) {
  if (values.includes(id)) {
    return values.filter((value) => value !== id);
  }

  return [...values, id];
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [modules, setModules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({
    role: '',
    classId: '',
    search: ''
  });
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({
    page: 1,
    limit: USER_PAGE_LIMIT,
    totalItems: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false
  });

  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const [classError, setClassError] = useState('');
  const [classNotice, setClassNotice] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentNotice, setAssignmentNotice] = useState('');
  const [userError, setUserError] = useState('');
  const [userNotice, setUserNotice] = useState('');

  const [isSavingClass, setIsSavingClass] = useState(false);
  const [isDeletingClassId, setIsDeletingClassId] = useState(null);
  const [isSavingCourseAssignment, setIsSavingCourseAssignment] = useState(false);
  const [isSavingTeacherAssignment, setIsSavingTeacherAssignment] = useState(false);
  const [isSavingResetCredentials, setIsSavingResetCredentials] = useState(false);

  const [assignmentClassId, setAssignmentClassId] = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);

  const [classForm, setClassForm] = useState({
    name: '',
    gradeLevel: '',
    teacherId: ''
  });
  const [editingClassId, setEditingClassId] = useState(null);

  const [credentialForm, setCredentialForm] = useState({
    userId: null,
    temporaryPassword: ''
  });

  const [userFile, setUserFile] = useState(null);
  const [isImportingUsers, setIsImportingUsers] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSummary, setImportSummary] = useState(null);

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [classes]
  );

  const selectedClass = useMemo(
    () => classes.find((item) => String(item.id) === String(assignmentClassId)) || null,
    [assignmentClassId, classes]
  );

  const resetClassForm = () => {
    setClassForm({ name: '', gradeLevel: '', teacherId: '' });
    setEditingClassId(null);
  };

  const loadClasses = async () => {
    setIsLoadingClasses(true);
    setClassError('');

    try {
      const response = await apiClient.get('/admin/classes');
      setClasses(response.data?.data || []);
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Failed to load classrooms.');
      setClassError(message);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const loadAssignmentMetadata = async () => {
    setIsLoadingAssignments(true);
    setAssignmentError('');

    try {
      const [moduleResponse, teacherResponse] = await Promise.all([
        apiClient.get('/admin/modules'),
        apiClient.get('/admin/teachers')
      ]);

      setModules(moduleResponse.data?.data || []);
      setTeachers(teacherResponse.data?.data || []);
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Failed to load assignment options.');
      setAssignmentError(message);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const loadManagedUsers = async ({
    page = userPage,
    role = userFilters.role,
    classId = userFilters.classId,
    search = userFilters.search
  } = {}) => {
    setIsLoadingUsers(true);
    setUserError('');

    try {
      const query = {
        page,
        limit: USER_PAGE_LIMIT
      };

      if (role) {
        query.role = role;
      }

      if (classId) {
        query.class_id = classId;
      }

      if (search) {
        query.search = search;
      }

      const response = await apiClient.get('/admin/users', { params: query });
      setUsers(response.data?.data || []);

      const pagination = response.data?.pagination || {};
      setUserPagination({
        page: Number(pagination.page) || page,
        limit: Number(pagination.limit) || USER_PAGE_LIMIT,
        totalItems: Number(pagination.totalItems) || 0,
        totalPages: Number(pagination.totalPages) || 1,
        hasPrevious: Boolean(pagination.hasPrevious),
        hasNext: Boolean(pagination.hasNext)
      });
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Failed to load users.');
      setUserError(message);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    Promise.all([loadClasses(), loadAssignmentMetadata()]);
  }, []);

  useEffect(() => {
    loadManagedUsers();
  }, [userPage, userFilters.role, userFilters.classId, userFilters.search]);

  useEffect(() => {
    if (!assignmentClassId && classes.length > 0) {
      setAssignmentClassId(String(classes[0].id));
    }

    if (
      assignmentClassId &&
      classes.length > 0 &&
      !classes.some((item) => String(item.id) === String(assignmentClassId))
    ) {
      setAssignmentClassId(String(classes[0].id));
    }
  }, [assignmentClassId, classes]);

  useEffect(() => {
    if (!selectedClass) {
      setSelectedModuleIds([]);
      setSelectedTeacherIds([]);
      return;
    }

    const classModuleIds = (selectedClass.assignedModules || []).map((module) => module.id);
    const classTeacherIds = (selectedClass.assignedTeachers || []).map((teacher) => teacher.id);
    setSelectedModuleIds(classModuleIds);
    setSelectedTeacherIds(classTeacherIds);
  }, [selectedClass]);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const handleUserRoleFilterChange = (event) => {
    const nextRole = event.target.value;
    setUserFilters((prev) => ({
      ...prev,
      role: nextRole
    }));
    setUserPage(1);
  };

  const handleUserClassFilterChange = (event) => {
    const nextClassId = event.target.value;
    setUserFilters((prev) => ({
      ...prev,
      classId: nextClassId
    }));
    setUserPage(1);
  };

  const handleUserSearchSubmit = (event) => {
    event.preventDefault();

    setUserFilters((prev) => ({
      ...prev,
      search: userSearchInput.trim()
    }));
    setUserPage(1);
  };

  const handleClearUserFilters = () => {
    setUserSearchInput('');
    setUserFilters({ role: '', classId: '', search: '' });
    setUserPage(1);
  };

  const handleSaveClass = async (event) => {
    event.preventDefault();
    setClassError('');
    setClassNotice('');

    if (!classForm.name.trim()) {
      setClassError('Class name is required.');
      return;
    }

    setIsSavingClass(true);

    try {
      const payload = {
        name: classForm.name.trim(),
        gradeLevel: classForm.gradeLevel.trim() || null,
        teacherId: classForm.teacherId ? Number(classForm.teacherId) : null
      };

      if (editingClassId) {
        await apiClient.put(`/admin/classes/${editingClassId}`, payload);
        setClassNotice('Classroom updated successfully.');
      } else {
        await apiClient.post('/admin/classes', payload);
        setClassNotice('Classroom created successfully.');
      }

      resetClassForm();
      await Promise.all([loadClasses(), loadManagedUsers()]);
    } catch (error) {
      const message = await extractApiErrorMessage(
        error,
        editingClassId ? 'Failed to update classroom.' : 'Failed to create classroom.'
      );
      setClassError(message);
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleEditClass = (classRecord) => {
    setClassError('');
    setClassNotice('Editing classroom details. Save when done.');
    setEditingClassId(classRecord.id);
    setClassForm({
      name: classRecord.name || '',
      gradeLevel: classRecord.gradeLevel || '',
      teacherId: classRecord.teacherId ? String(classRecord.teacherId) : ''
    });
  };

  const handleDeleteClass = async (classRecord) => {
    setClassError('');
    setClassNotice('');

    const confirmed = window.confirm(
      `Delete classroom ${classRecord.name}? This will remove its teacher and course assignments.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingClassId(classRecord.id);

    try {
      await apiClient.delete(`/admin/classes/${classRecord.id}`);
      setClassNotice(`Classroom ${classRecord.name} deleted successfully.`);

      if (editingClassId && Number(editingClassId) === Number(classRecord.id)) {
        resetClassForm();
      }

      await Promise.all([loadClasses(), loadManagedUsers()]);
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Failed to delete classroom.');
      setClassError(message);
    } finally {
      setIsDeletingClassId(null);
    }
  };

  const handleSaveCourseAssignments = async () => {
    setAssignmentError('');
    setAssignmentNotice('');

    if (!assignmentClassId) {
      setAssignmentError('Select a class before saving course assignments.');
      return;
    }

    setIsSavingCourseAssignment(true);

    try {
      await apiClient.put(`/admin/classes/${assignmentClassId}/courses`, {
        moduleIds: selectedModuleIds
      });

      await loadClasses();
      setAssignmentNotice('Course assignments saved successfully.');
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Failed to save course assignments.');
      setAssignmentError(message);
    } finally {
      setIsSavingCourseAssignment(false);
    }
  };

  const handleSaveTeacherAssignments = async () => {
    setAssignmentError('');
    setAssignmentNotice('');

    if (!assignmentClassId) {
      setAssignmentError('Select a class before saving teacher assignments.');
      return;
    }

    setIsSavingTeacherAssignment(true);

    try {
      await apiClient.put(`/admin/classes/${assignmentClassId}/teachers`, {
        teacherIds: selectedTeacherIds
      });

      await Promise.all([loadClasses(), loadManagedUsers()]);
      setAssignmentNotice('Teacher assignments saved successfully.');
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Failed to save teacher assignments.');
      setAssignmentError(message);
    } finally {
      setIsSavingTeacherAssignment(false);
    }
  };

  const handleImportUsers = async (event) => {
    event.preventDefault();
    setImportError('');
    setImportSummary(null);

    if (!userFile) {
      setImportError('Please choose a CSV/XLSX/XLS file first.');
      return;
    }

    setIsImportingUsers(true);

    try {
      const formData = new FormData();
      formData.append('file', userFile);

      const response = await apiClient.post('/admin/bulk-upload/users', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
      });

      const disposition = response.headers['content-disposition'];
      const filename = getFileNameFromDisposition(disposition);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      const summary = parseImportSummaryHeader(response.headers);
      setImportSummary(summary || { usersCreated: 'Completed' });
      setUserFile(null);

      await Promise.all([loadClasses(), loadAssignmentMetadata(), loadManagedUsers()]);
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Bulk import failed.');
      setImportError(message);
    } finally {
      setIsImportingUsers(false);
    }
  };

  const startResetCredentials = (userId) => {
    setUserError('');
    setUserNotice('');
    setCredentialForm({ userId, temporaryPassword: '' });
  };

  const cancelResetCredentials = () => {
    setCredentialForm({ userId: null, temporaryPassword: '' });
  };

  const handleResetCredentials = async (userId) => {
    setUserError('');
    setUserNotice('');

    if (!credentialForm.temporaryPassword.trim()) {
      setUserError('Temporary password is required.');
      return;
    }

    if (credentialForm.temporaryPassword.trim().length < 6) {
      setUserError('Temporary password must be at least 6 characters long.');
      return;
    }

    setIsSavingResetCredentials(true);

    try {
      await apiClient.put(`/admin/users/${userId}/reset-credentials`, {
        temporaryPassword: credentialForm.temporaryPassword.trim()
      });

      const selectedUser = users.find((user) => Number(user.id) === Number(userId));
      setUserNotice(`Temporary credentials updated for ${selectedUser?.fullName || 'user'}.`);
      setCredentialForm({ userId: null, temporaryPassword: '' });
      await loadManagedUsers();
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Failed to reset user credentials.');
      setUserError(message);
    } finally {
      setIsSavingResetCredentials(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Classroom management, user provisioning, and credential control</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200"
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">
            {editingClassId ? 'Edit Classroom' : 'Classroom Creation'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingClassId
              ? 'Update class name, grade level, or primary teacher.'
              : 'Create physical classes like Grade 1A or Grade 8B.'}
          </p>

          <form onSubmit={handleSaveClass} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Class Name</label>
              <input
                type="text"
                value={classForm.name}
                onChange={(event) => setClassForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Grade 1A"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-300 focus:ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Grade Level</label>
              <input
                type="text"
                value={classForm.gradeLevel}
                onChange={(event) => setClassForm((prev) => ({ ...prev, gradeLevel: event.target.value }))}
                placeholder="Grade 1"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-300 focus:ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Teacher (optional)</label>
              <select
                value={classForm.teacherId}
                onChange={(event) =>
                  setClassForm((prev) => ({
                    ...prev,
                    teacherId: event.target.value
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-300 focus:ring"
              >
                <option value="">No teacher selected</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>

            {classError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {classError}
              </div>
            )}

            {classNotice && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {classNotice}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isSavingClass}
                className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingClass ? 'Saving...' : editingClassId ? 'Save Classroom Changes' : 'Create Classroom'}
              </button>

              {editingClassId && (
                <button
                  type="button"
                  onClick={resetClassForm}
                  className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">Bulk User Import</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload CSV/XLSX with fullName, email(optional), role, className, and ParentEmail for student rows. A credential PDF downloads automatically.
          </p>

          <form onSubmit={handleImportUsers} className="mt-5 space-y-4">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => setUserFile(event.target.files?.[0] || null)}
              className="block w-full text-sm"
            />

            {importError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {importError}
              </div>
            )}

            {importSummary && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Import complete: {Object.entries(importSummary).map(([key, value]) => `${key}=${value}`).join(', ')}
              </div>
            )}

            <button
              type="submit"
              disabled={isImportingUsers}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImportingUsers ? 'Importing...' : 'Import Users & Download PDF'}
            </button>
          </form>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">Course & Teacher Assignment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign modules and teacher sections for each class. Students only see modules assigned to their class.
          </p>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Select Class</label>
            <select
              value={assignmentClassId}
              onChange={(event) => setAssignmentClassId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-300 focus:ring"
              disabled={isLoadingClasses || classes.length === 0}
            >
              {classes.length === 0 ? (
                <option value="">No classes available</option>
              ) : (
                classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.gradeLevel ? `(${item.gradeLevel})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {assignmentError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {assignmentError}
            </div>
          )}

          {assignmentNotice && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {assignmentNotice}
            </div>
          )}

          {isLoadingAssignments ? (
            <p className="mt-6 text-sm text-slate-500">Loading assignment options...</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-lg font-semibold text-slate-800">Assign Course Modules</h3>
                <p className="mt-1 text-xs text-slate-500">Select one or more modules for this class section.</p>

                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {modules.length === 0 ? (
                    <p className="text-sm text-slate-500">No modules found yet.</p>
                  ) : (
                    modules.map((module) => {
                      const isChecked = selectedModuleIds.includes(module.id);
                      return (
                        <label
                          key={module.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setSelectedModuleIds((prev) => toggleInArray(prev, module.id))}
                            className="mt-1"
                          />
                          <span className="text-sm text-slate-700">
                            <strong>{module.title}</strong>
                            <br />
                            <span className="text-xs text-slate-500">
                              Origin: {module.class?.name || 'Unassigned Class'}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveCourseAssignments}
                  disabled={isSavingCourseAssignment || !assignmentClassId}
                  className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCourseAssignment ? 'Saving...' : 'Save Course Assignments'}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-lg font-semibold text-slate-800">Assign Teachers to Class</h3>
                <p className="mt-1 text-xs text-slate-500">Select all teachers responsible for this class section.</p>

                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {teachers.length === 0 ? (
                    <p className="text-sm text-slate-500">No teachers found yet.</p>
                  ) : (
                    teachers.map((teacher) => {
                      const isChecked = selectedTeacherIds.includes(teacher.id);
                      return (
                        <label
                          key={teacher.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setSelectedTeacherIds((prev) => toggleInArray(prev, teacher.id))}
                            className="mt-1"
                          />
                          <span className="text-sm text-slate-700">
                            <strong>{teacher.fullName}</strong>
                            <br />
                            <span className="text-xs text-slate-500">{teacher.email}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveTeacherAssignments}
                  disabled={isSavingTeacherAssignment || !assignmentClassId}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingTeacherAssignment ? 'Saving...' : 'Save Teacher Assignments'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Detailed User List & Credential Management</h2>
            <button
              onClick={() => loadManagedUsers()}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
              <select
                value={userFilters.role}
                onChange={handleUserRoleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:ring"
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Teacher">Teacher</option>
                <option value="Student">Student</option>
                <option value="Parent">Parent</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</label>
              <select
                value={userFilters.classId}
                onChange={handleUserClassFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:ring"
              >
                <option value="">All Classes</option>
                {sortedClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.gradeLevel ? `(${item.gradeLevel})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleUserSearchSubmit} className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search (Name or ID)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userSearchInput}
                  onChange={(event) => setUserSearchInput(event.target.value)}
                  placeholder="e.g. Jelalu or 42"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:ring"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClearUserFilters}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {userError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {userError}
            </div>
          )}

          {userNotice && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {userNotice}
            </div>
          )}

          {isLoadingUsers ? (
            <p className="text-sm text-slate-500">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500">No students, teachers, or parents found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Username</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Assigned Class</th>
                    <th className="px-3 py-2">Reset Credentials</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">#{user.id}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{user.fullName}</td>
                      <td className="px-3 py-2 text-slate-600">{user.role}</td>
                      <td className="px-3 py-2 text-slate-600">{user.username || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{user.email}</td>
                      <td className="px-3 py-2 text-slate-600">{user.status || 'Active'}</td>
                      <td className="px-3 py-2 text-slate-600">{user.assignedClass || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {credentialForm.userId === user.id ? (
                          <div className="flex min-w-64 flex-col gap-2">
                            <input
                              type="password"
                              value={credentialForm.temporaryPassword}
                              onChange={(event) =>
                                setCredentialForm((prev) => ({
                                  ...prev,
                                  temporaryPassword: event.target.value
                                }))
                              }
                              placeholder="Enter temporary password"
                              className="rounded-lg border border-slate-300 px-2 py-1.5 outline-none ring-cyan-300 focus:ring"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleResetCredentials(user.id)}
                                disabled={isSavingResetCredentials}
                                className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isSavingResetCredentials ? 'Saving...' : 'Save Password'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelResetCredentials}
                                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startResetCredentials(user.id)}
                            className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                          >
                            Reset Credentials
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Page {userPagination.page} of {userPagination.totalPages} • {userPagination.totalItems} total users
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                disabled={!userPagination.hasPrevious || isLoadingUsers}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setUserPage((prev) => prev + 1)}
                disabled={!userPagination.hasNext || isLoadingUsers}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Existing Classrooms</h2>
            <button
              onClick={loadClasses}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {isLoadingClasses ? (
            <p className="text-sm text-slate-500">Loading classrooms...</p>
          ) : sortedClasses.length === 0 ? (
            <p className="text-sm text-slate-500">No classrooms found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Primary Teacher</th>
                    <th className="px-3 py-2">Assigned Teachers</th>
                    <th className="px-3 py-2">Assigned Modules</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClasses.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-3 py-2 text-slate-600">{item.gradeLevel || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{item.teacher?.fullName || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {(item.assignedTeachers || []).length > 0
                          ? item.assignedTeachers.map((teacher) => teacher.fullName).join(', ')
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {(item.assignedModules || []).length > 0
                          ? item.assignedModules.map((module) => module.title).join(', ')
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditClass(item)}
                            className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(item)}
                            disabled={isDeletingClassId === item.id}
                            className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeletingClassId === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
