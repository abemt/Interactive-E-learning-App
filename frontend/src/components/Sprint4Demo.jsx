import { useState } from 'react';
import StudentDashboard from './student/StudentDashboard';
import FidelChart from './student/FidelChart';
import GameEngineRouter from './games/GameEngineRouter';
import QuizFeedbackModal from './student/QuizFeedbackModal';

/**
 * Sprint4Demo Component
 * Demonstrates all Sprint 4 features with navigation
 */
function Sprint4Demo() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [showFeedback, setShowFeedback] = useState(false);

  // Mock course data for game engine
  const mockCourseData = {
    math: {
      title: 'Math Adventure',
      subject: 'Math',
      description: 'Practice arithmetic with falling blocks!',
      difficulty: 'easy'
    },
    science: {
      title: 'Science Explorer',
      subject: 'Science',
      description: 'Sort living and non-living things!',
      categories: [
        { id: 1, name: 'Living Things', color: 'success', emoji: '🌱' },
        { id: 2, name: 'Non-Living Things', color: 'primary', emoji: '🪨' }
      ],
      items: [
        { id: 1, text: 'Tree', category: 1, emoji: '🌳' },
        { id: 2, text: 'Rock', category: 2, emoji: '🪨' },
        { id: 3, text: 'Dog', category: 1, emoji: '🐕' },
        { id: 4, text: 'Water', category: 2, emoji: '💧' },
        { id: 5, text: 'Bird', category: 1, emoji: '🐦' },
        { id: 6, text: 'Cloud', category: 2, emoji: '☁️' }
      ]
    }
  };

  // Mock quiz results for feedback modal
  const mockQuizResults = {
    totalQuestions: 5,
    correctAnswers: 3,
    score: 75,
    percentage: 75,
    xpEarned: 100,
    leveledUp: false,
    incorrectAnswers: [
      {
        questionText: 'What is 5 + 3?',
        studentAnswer: '7',
        correctAnswer: '8',
        explanation: 'When you add 5 and 3, you count: 5...6, 7, 8. The answer is 8!'
      },
      {
        questionText: 'What color is the sky on a sunny day?',
        studentAnswer: 'Green',
        correctAnswer: 'Blue',
        explanation: 'The sky appears blue because of how sunlight scatters in our atmosphere.'
      }
    ]
  };

  // Navigation menu
  const menuItems = [
    { id: 'dashboard', label: 'Student Dashboard', icon: '🏠' },
    { id: 'fidel', label: 'Fidel Chart', icon: '🔤' },
    { id: 'mathGame', label: 'Math Game', icon: '🔢' },
    { id: 'scienceGame', label: 'Science Game', icon: '🔬' },
    { id: 'feedback', label: 'Quiz Feedback', icon: '📊' }
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <StudentDashboard />;
      case 'fidel':
        return <FidelChart />;
      case 'mathGame':
        return <GameEngineRouter courseData={mockCourseData.math} />;
      case 'scienceGame':
        return <GameEngineRouter courseData={mockCourseData.science} />;
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Demo Navigation Bar */}
      <div className="bg-gradient-to-r from-primary-600 to-success-600 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-3">🎮 Sprint 4 Demo - Student PWA Features</h1>
          <div className="flex flex-wrap gap-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'feedback') {
                    setShowFeedback(true);
                  } else {
                    setCurrentView(item.id);
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  currentView === item.id
                    ? 'bg-white text-primary-600 shadow-lg scale-105'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-120px)]">
        {renderView()}
      </div>

      {/* Quiz Feedback Modal */}
      <QuizFeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        quizResults={mockQuizResults}
      />
    </div>
  );
}

export default Sprint4Demo;
