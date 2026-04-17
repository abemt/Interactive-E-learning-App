import apiClient from './apiClient';
import { submitQuizAnswerWithOfflineSupport, syncPendingQuizSubmissions } from './indexedDBService';

/**
 * Submit a student quiz answer with automatic offline fallback.
 */
export async function submitQuizAnswer(payload) {
  return submitQuizAnswerWithOfflineSupport(payload);
}

/**
 * Submit a quiz answer directly (online only).
 */
export async function submitQuizAnswerOnline(payload) {
  const response = await apiClient.post('/quiz/submit-answer', payload);
  return response.data;
}

/**
 * Sync all pending offline quiz answers.
 */
export async function syncOfflineQuizAnswers() {
  return syncPendingQuizSubmissions();
}

export default {
  submitQuizAnswer,
  submitQuizAnswerOnline,
  syncOfflineQuizAnswers
};
