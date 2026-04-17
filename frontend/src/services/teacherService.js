import apiClient from './apiClient';

export async function fetchTeacherAssignedClasses() {
  const response = await apiClient.get('/content/teacher/classes');
  return response.data?.data || [];
}

export async function fetchTeacherAnalytics(classId) {
  const response = await apiClient.get('/content/teacher/analytics', {
    params: classId ? { classId } : undefined
  });

  return response.data?.data || {
    summary: {
      totalStudentsInAssignedClasses: 0,
      averageClassXP: 0
    },
    selectedClassId: null,
    classes: [],
    roster: []
  };
}

export async function updateContentLock({ id, entityType, isLocked }) {
  const response = await apiClient.put(`/content/lock/${id}`, {
    entityType,
    isLocked
  });

  return response.data?.data;
}
