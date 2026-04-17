import { useState, useEffect } from 'react';
import Sidebar from '../common/Sidebar';

/**
 * StudentDashboard Component
 * Vibrant, child-centric design for students
 * Shows XP, level, progress bar, and course selection
 */
function StudentDashboard() {
  const [studentData, setStudentData] = useState({
    name: 'Student',
    level: 3,
    currentXP: 370,
    nextLevelXP: 500,
    totalXP: 370,
    badges: 2,
    coursesCompleted: 1
  });

  const [courses, setCourses] = useState([
    {
      id: 1,
      title: 'Amharic Fidel',
      subject: 'Language',
      icon: '🔤',
      progress: 65,
      color: 'primary',
      locked: false
    },
    {
      id: 2,
      title: 'Math Adventure',
      subject: 'Math',
      icon: '🔢',
      progress: 40,
      color: 'success',
      locked: false
    },
    {
      id: 3,
      title: 'Science Explorer',
      subject: 'Science',
      icon: '🔬',
      progress: 20,
      color: 'accent',
      locked: false
    },
    {
      id: 4,
      title: 'English Letters',
      subject: 'Language',
      icon: '📚',
      progress: 0,
      color: 'primary',
      locked: true
    }
  ]);

  const progressPercentage = (studentData.currentXP / studentData.nextLevelXP) * 100;

  const handleCourseClick = (course) => {
    if (course.locked) {
      alert('🔒 Complete previous courses to unlock this one!');
      return;
    }
    // Navigate to course - will be implemented in routing
    console.log('Opening course:', course);
    alert(`Opening ${course.title}... (Course navigation coming soon)`);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50 via-accent-50 to-success-50">
      {/* Sidebar */}
      <Sidebar userRole="Student" />

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary-600 to-success-600 rounded-2xl shadow-2xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* User Info */}
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                Welcome back, {studentData.name}! 🎉
              </h1>
              <p className="text-xl md:text-2xl opacity-90">
                You're on an amazing learning journey!
              </p>
            </div>

            {/* Level Badge */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center min-w-[180px]">
              <div className="text-6xl mb-2">🏆</div>
              <div className="text-3xl font-bold">Level {studentData.level}</div>
              <div className="text-sm opacity-90 mt-1">Apprentice</div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold">
                {studentData.currentXP} XP
              </span>
              <span className="text-lg font-semibold">
                {studentData.nextLevelXP} XP to Level {studentData.level + 1}
              </span>
            </div>
            <div className="h-6 bg-white/30 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-accent-400 to-accent-600 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                style={{ width: `${progressPercentage}%` }}
              >
                <span className="text-white font-bold text-sm drop-shadow-md">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-5xl">⭐</div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Total XP</p>
                <p className="text-3xl font-bold text-primary-600">{studentData.totalXP}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🏅</div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Badges Earned</p>
                <p className="text-3xl font-bold text-success-600">{studentData.badges}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-5xl">✅</div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Courses Done</p>
                <p className="text-3xl font-bold text-accent-600">{studentData.coursesCompleted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Journey Section */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">My Learning Journey 🚀</h2>
          <p className="text-gray-600 text-lg">Choose a course to continue your adventure!</p>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => handleCourseClick(course)}
              disabled={course.locked}
              className={`bg-white rounded-2xl shadow-lg p-8 text-left transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95 ${
                course.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {/* Lock Badge */}
              {course.locked && (
                <div className="absolute top-4 right-4 bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl">
                  🔒
                </div>
              )}

              {/* Course Icon */}
              <div className="text-7xl mb-4">{course.icon}</div>

              {/* Course Info */}
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{course.title}</h3>
              <p className={`text-lg font-medium text-${course.color}-600 mb-4`}>
                {course.subject}
              </p>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-gray-600">Progress</span>
                  <span className="text-sm font-bold text-gray-800">{course.progress}%</span>
                </div>
                <div className={`h-3 bg-gray-200 rounded-full overflow-hidden`}>
                  <div
                    className={`h-full bg-gradient-to-r from-${course.color}-400 to-${course.color}-600 rounded-full transition-all duration-500`}
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Text */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                {course.locked ? (
                  <span className="text-gray-500 font-medium">🔒 Locked</span>
                ) : course.progress > 0 ? (
                  <span className={`text-${course.color}-600 font-bold text-lg`}>
                    Continue Learning →
                  </span>
                ) : (
                  <span className={`text-${course.color}-600 font-bold text-lg`}>
                    Start Course →
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Daily Challenge Banner */}
        <div className="mt-8 bg-gradient-to-r from-accent-400 to-accent-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="text-6xl">🎯</div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-1">Daily Challenge</h3>
              <p className="text-lg opacity-90">Complete 3 quizzes today to earn a bonus badge!</p>
            </div>
            <button className="bg-white text-accent-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-accent-50 transition-colors shadow-lg">
              Start →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
