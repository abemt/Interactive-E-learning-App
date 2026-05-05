import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ForceChangePassword from './components/auth/ForceChangePassword'
import ProtectedRoute from './components/auth/ProtectedRoute'
import StudentDashboardNew from './components/student/StudentDashboardNew'
import QuizEngine from './components/student/QuizEngine'
import QuizResults from './components/student/QuizResults'
import ImmersiveViewer from './components/student/ImmersiveViewer'
import TeacherDashboardSimple from './components/teacher/TeacherDashboardSimple'
import TeacherDashboard from './components/teacher/TeacherDashboard'
import LessonBuilder from './components/teacher/LessonBuilder'
import QuizBuilder from './components/teacher/QuizBuilder'
import ClassAnalytics from './components/teacher/ClassAnalytics'
import TeacherLayout from './components/teacher/TeacherLayout'
import FidelChart from './components/student/FidelChart'
import DragAndDropTemplate from './components/games/DragAndDropTemplate'
import FallingBlocksGame from './components/games/FallingBlocksGame'
import AdminDashboard from './components/admin/AdminDashboard'
import ParentDashboard from './components/parent/ParentDashboard'
import { DashboardThemeProvider } from './context/DashboardThemeContext'

function App() {
  const allRoles = ['Student', 'Teacher', 'Parent', 'Admin']

  return (
    <DashboardThemeProvider>
      <Router>
        <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute allowedRoles={allRoles} requirePasswordChange>
              <ForceChangePassword />
            </ProtectedRoute>
          }
        />
        
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <StudentDashboardNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/fidel"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <FidelChart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/games/science"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <DragAndDropTemplate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/games/math"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <FallingBlocksGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/quiz/:quizId"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <QuizEngine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/quiz/:quizId/results"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <QuizResults />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/lesson/:lessonId"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <ImmersiveViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/stories"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-8">
                <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-lg">
                  <h1 className="mb-2 text-3xl font-bold text-gray-800">Story Mode</h1>
                  <p className="text-gray-600">Story Mode is coming soon. Please choose another module from the dashboard for now.</p>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
        
        {/* Teacher Routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={['Teacher']}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboardSimple />} />
          <Route path="classes" element={<TeacherDashboardSimple />} />
          <Route path="analytics" element={<ClassAnalytics />} />
          <Route path="content" element={<TeacherDashboard />} />
          <Route path="lesson/create" element={<LessonBuilder />} />
          <Route path="quiz/create" element={<QuizBuilder />} />
        </Route>
        
        {/* Parent Routes */}
        <Route
          path="/parent/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Parent']}>
              <ParentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* 404 Route */}
        <Route path="*" element={
          <div className="p-8 text-center bg-red-100 min-h-screen">
            <h1 className="text-3xl font-bold font-mono">404 NOT FOUND Catch-All Hit!</h1>
            <p>You tried to go to a URL that does not match any route.</p>
            <p>Go manually to /login to restart.</p>
          </div>
        } />
        </Routes>
      </Router>
    </DashboardThemeProvider>
  )
}

export default App
