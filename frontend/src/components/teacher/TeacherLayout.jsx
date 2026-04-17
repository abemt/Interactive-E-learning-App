import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthUser } from '../../services/authStorage';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/teacher/dashboard' },
  { id: 'classes', label: 'My Classes', icon: '🏫', path: '/teacher/classes' },
  { id: 'content', label: 'Content Manager', icon: '📚', path: '/teacher/content' },
  { id: 'analytics', label: 'Analytics', icon: '📈', path: '/teacher/analytics' }
];

function toTitle(value) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildTeacherBreadcrumbs(pathname, search) {
  const query = new URLSearchParams(search || '');
  const mode = (query.get('mode') || '').toLowerCase();

  if (pathname === '/teacher/dashboard') {
    return ['Dashboard'];
  }

  if (pathname === '/teacher/classes') {
    return ['Dashboard', 'My Classes'];
  }

  if (pathname === '/teacher/content') {
    return ['Dashboard', 'Content Manager'];
  }

  if (pathname.startsWith('/teacher/lesson/create')) {
    return ['Dashboard', 'Content Manager', mode === 'edit' ? 'Edit Lesson' : 'Create Lesson'];
  }

  if (pathname.startsWith('/teacher/quiz/create')) {
    return ['Dashboard', 'Content Manager', mode === 'edit' ? 'Edit Quiz' : 'Create Quiz'];
  }

  if (pathname.startsWith('/teacher/analytics')) {
    return ['Dashboard', 'Analytics'];
  }

  const parts = pathname.split('/').filter(Boolean);
  const teacherIndex = parts.indexOf('teacher');
  const routeParts = teacherIndex >= 0 ? parts.slice(teacherIndex + 1) : parts;

  if (routeParts.length === 0) {
    return ['Dashboard'];
  }

  return ['Dashboard', ...routeParts.map(toTitle)];
}

function TeacherLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser();

  const breadcrumbs = buildTeacherBreadcrumbs(location.pathname, location.search);
  const pageTitle = breadcrumbs[breadcrumbs.length - 1] || 'Dashboard';

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-slate-200 bg-white shadow-xl lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-6 py-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Interactive E-Learning</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Teacher Workspace</p>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-5">
          {navigationItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/teacher/content' && location.pathname.startsWith('/teacher/quiz')) ||
              (item.path === '/teacher/content' && location.pathname.startsWith('/teacher/lesson'));

            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-6 py-5">
          <div className="mb-3 text-sm font-semibold text-slate-900">{user?.fullName || 'Teacher'}</div>
          <div className="mb-4 text-xs text-slate-500">{user?.email || 'Signed in'}</div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Log Out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{pageTitle}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{breadcrumbs.join(' > ')}</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Teacher Portal
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default TeacherLayout;