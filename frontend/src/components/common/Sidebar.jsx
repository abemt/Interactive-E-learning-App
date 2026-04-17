import { NavLink } from 'react-router-dom';
import { getAuthUser } from '../../services/authStorage';

/**
 * Sidebar Component
 * Clean, structured navigation sidebar
 */
function Sidebar({ userRole = 'Teacher' }) {
  const authUser = getAuthUser();

  const teacherClassId = localStorage.getItem('teacherClassId');
  const teacherContentPath = teacherClassId
    ? `/teacher/content?classId=${teacherClassId}`
    : '/teacher/content';
  const teacherAnalyticsPath = teacherClassId
    ? `/teacher/analytics?classId=${teacherClassId}`
    : '/teacher/analytics';

  const menuByRole = {
    Teacher: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/teacher/dashboard' },
      { id: 'content', label: 'Content Library', icon: '📚', path: teacherContentPath },
      { id: 'analytics', label: 'Class Analytics', icon: '📈', path: teacherAnalyticsPath },
      { id: 'build-lesson', label: 'Build Lesson', icon: '🧩', path: '/teacher/lesson/create' },
      { id: 'build-quiz', label: 'Build Quiz', icon: '📝', path: '/teacher/quiz/create' }
    ],
    Student: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/student/dashboard' },
      { id: 'fidel', label: 'Fidel Chart', icon: '🔤', path: '/student/fidel' },
      { id: 'science', label: 'Science Game', icon: '🧪', path: '/student/games/science' },
      { id: 'math', label: 'Math Game', icon: '🔢', path: '/student/games/math' }
    ],
    Admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin/dashboard' }
    ]
  };

  const filteredMenuItems = menuByRole[userRole] || [];

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0 overflow-y-auto">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-success-600 bg-clip-text text-transparent">
          E-Learning
        </h1>
        <p className="text-sm text-gray-600 mt-1">{userRole} Portal</p>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
            T
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{authUser?.fullName || `${userRole} User`}</p>
            <p className="text-xs text-gray-500">{authUser?.email || 'Not signed in'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
