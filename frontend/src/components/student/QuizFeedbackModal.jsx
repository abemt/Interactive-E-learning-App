import { useState } from 'react';

/**
 * QuizFeedbackModal Component
 * Post-quiz feedback displaying incorrect answers with explanations
 * Uses Tailwind to style correct answers in green and incorrect in red
 */
function QuizFeedbackModal({ isOpen, onClose, quizResults }) {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  if (!isOpen || !quizResults) return null;

  const {
    totalQuestions = 0,
    correctAnswers = 0,
    incorrectAnswers = [],
    score = 0,
    percentage = 0,
    xpEarned = 0,
    leveledUp = false,
    newLevel = null
  } = quizResults;

  const isPerfect = correctAnswers === totalQuestions;
  const isGood = percentage >= 80;

  const handleNextReview = () => {
    if (currentReviewIndex < incorrectAnswers.length - 1) {
      setCurrentReviewIndex(prev => prev + 1);
    }
  };

  const handlePrevReview = () => {
    if (currentReviewIndex > 0) {
      setCurrentReviewIndex(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setCurrentReviewIndex(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className={`${
          isPerfect
            ? 'bg-gradient-to-r from-success-500 to-success-600'
            : isGood
            ? 'bg-gradient-to-r from-primary-500 to-primary-600'
            : 'bg-gradient-to-r from-accent-500 to-accent-600'
        } text-white px-8 py-6 rounded-t-3xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-7xl">
                {isPerfect ? '🏆' : isGood ? '🎉' : '💪'}
              </div>
              <div>
                <h2 className="text-4xl font-bold mb-1">
                  {isPerfect ? 'Perfect Score!' : isGood ? 'Great Job!' : 'Keep Practicing!'}
                </h2>
                <p className="text-xl opacity-90">
                  {isPerfect
                    ? "You're amazing! Every answer was correct!"
                    : isGood
                    ? "You did really well! Let's review a few things."
                    : "Good effort! Let's learn from these mistakes."}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center text-4xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Score Summary */}
        <div className="p-8 bg-gray-50 border-b-4 border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-600 mb-2">
                {correctAnswers}/{totalQuestions}
              </div>
              <div className="text-lg font-semibold text-gray-600">Correct</div>
            </div>
            
            <div className="text-center">
              <div className="text-5xl font-bold text-accent-600 mb-2">
                {percentage}%
              </div>
              <div className="text-lg font-semibold text-gray-600">Score</div>
            </div>
            
            <div className="text-center">
              <div className="text-5xl font-bold text-success-600 mb-2">
                +{xpEarned}
              </div>
              <div className="text-lg font-semibold text-gray-600">XP Earned</div>
            </div>
            
            {leveledUp && (
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-600 mb-2">
                  {newLevel}
                </div>
                <div className="text-lg font-semibold text-gray-600">New Level! 🎉</div>
              </div>
            )}
          </div>

          {/* XP Bonus Info */}
          {xpEarned > 0 && (
            <div className="mt-6 bg-gradient-to-r from-success-100 to-primary-100 rounded-2xl p-4 text-center">
              <p className="text-xl font-bold text-gray-800">
                {isPerfect && '🌟 Perfect Score Bonus: +50 XP!'}
                {!isPerfect && isGood && '⭐ High Score Bonus: +25 XP!'}
                {!isPerfect && !isGood && '💫 Keep going to earn XP bonuses!'}
              </p>
            </div>
          )}
        </div>

        {/* Review Incorrect Answers */}
        {incorrectAnswers.length > 0 ? (
          <div className="p-8">
            <h3 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span>📝</span> Let's Review Your Mistakes
            </h3>

            {/* Current Review Item */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-2xl p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-600">
                    Question {currentReviewIndex + 1} of {incorrectAnswers.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevReview}
                      disabled={currentReviewIndex === 0}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-gray-700 transition-colors"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={handleNextReview}
                      disabled={currentReviewIndex === incorrectAnswers.length - 1}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-gray-700 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="bg-white rounded-xl p-6 mb-4 border-l-4 border-gray-300">
                  <p className="text-2xl font-semibold text-gray-800">
                    {incorrectAnswers[currentReviewIndex].questionText}
                  </p>
                </div>

                {/* Your Answer (Wrong) */}
                <div className="bg-red-50 border-4 border-red-300 rounded-xl p-6 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">❌</div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-red-700 mb-2">
                        Your Answer:
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        {incorrectAnswers[currentReviewIndex].studentAnswer}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Correct Answer */}
                <div className="bg-success-50 border-4 border-success-300 rounded-xl p-6 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">✅</div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-success-700 mb-2">
                        Correct Answer:
                      </div>
                      <div className="text-2xl font-bold text-success-600">
                        {incorrectAnswers[currentReviewIndex].correctAnswer}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                {incorrectAnswers[currentReviewIndex].explanation && (
                  <div className="bg-primary-50 border-l-4 border-primary-400 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">💡</div>
                      <div className="flex-1">
                        <div className="text-lg font-bold text-primary-700 mb-2">
                          Why this is the answer:
                        </div>
                        <div className="text-xl text-gray-700">
                          {incorrectAnswers[currentReviewIndex].explanation}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {incorrectAnswers.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentReviewIndex(idx)}
                  className={`w-4 h-4 rounded-full transition-all ${
                    idx === currentReviewIndex
                      ? 'bg-primary-600 w-12'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-8xl mb-6">🌟</div>
            <h3 className="text-4xl font-bold text-success-600 mb-4">
              Perfect! No mistakes to review!
            </h3>
            <p className="text-2xl text-gray-600">
              You got every question right. Keep up the excellent work!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-8 bg-gray-50 border-t-4 border-gray-200 rounded-b-3xl">
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={handleClose}
              className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-12 py-4 rounded-2xl text-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              📚 Back to Dashboard
            </button>
            <button
              onClick={() => {
                handleClose();
                // Trigger retake logic
              }}
              className="bg-gradient-to-r from-accent-500 to-accent-600 text-white px-12 py-4 rounded-2xl text-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              🔄 Retake Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizFeedbackModal;
