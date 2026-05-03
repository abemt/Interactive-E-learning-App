import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser } from '../../services/authService';
import { getDashboardRouteByRole, setAuthSession } from '../../services/authStorage';

/**
 * Login Component
 * Based on the "Welcome Back" prototype
 * Allows users to select profile (Student/Teacher/Parent) and login
 */

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = location.state?.from?.pathname || null;
  const isFromAdmin = returnUrl && returnUrl.startsWith('/admin');

  const [selectedProfile, setSelectedProfile] = useState(isFromAdmin ? 'Admin' : 'Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const profiles = [
    { id: 'Student', label: 'Student', icon: '🎒', color: 'bg-pink-500 hover:bg-pink-600' },
    { id: 'Teacher', label: 'Teacher', icon: '🍎', color: 'bg-red-500 hover:bg-red-600' },
    { id: 'Parent', label: 'Parent', icon: '👨‍👩‍👧', color: 'bg-gray-500 hover:bg-gray-600' },
    { id: 'Admin', label: 'Admin', icon: '🛡️', color: 'bg-slate-700 hover:bg-slate-800' }
  ];

  const normalizeLoginEmail = (value) => String(value || '').trim().toLowerCase();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const normalizedEmail = normalizeLoginEmail(email);
      const result = await loginUser({ identifier: normalizedEmail, password });

      if (!result?.user) {
        throw new Error('Login response is missing user data.');
      }

      if (result.user.role !== selectedProfile) {
        throw new Error(`This account is registered as ${result.user.role}. Please select the correct profile.`);
      }

      setAuthSession({ user: result.user });

      if (result.user.needsPasswordChange) {
        navigate('/change-password', { replace: true });
        return;
      }
      
      // If we came from a specific page, return there, else go to default dashboard
      navigate(returnUrl || getDashboardRouteByRole(result.user.role));
    } catch (error) {
      console.error('Login error:', error);
      const message = error?.response?.data?.message || error.message || 'Login failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        {/* Rocket Icon */}
        <div className="flex justify-center mb-6">
          <div className="text-6xl animate-bounce">🚀</div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-2">
          Welcome Back
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Choose your profile to continue
        </p>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Contact the school admin for any registration requests or password resets.
        </div>

        <form onSubmit={handleLogin}>
          {/* Profile Selection */}
          <div className="flex gap-3 mb-8">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedProfile(profile.id)}
                className={`flex-1 py-4 rounded-2xl font-bold text-white text-sm transition-all duration-200 ${
                  selectedProfile === profile.id
                    ? profile.color + ' shadow-lg scale-105'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              >
                <div className="text-2xl mb-1">{profile.icon}</div>
                <div>{profile.label}</div>
              </button>
            ))}
          </div>

          {/* Email or Username Input */}
          <div className="mb-6">
            <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wide">
              Email or Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                👤
              </div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email or username"
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:bg-white focus:outline-none transition-all text-gray-800 font-medium"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                🔒
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:bg-white focus:outline-none transition-all text-gray-800 font-medium"
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all duration-200 shadow-lg ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl'
            }`}
          >
            {isLoading ? '⏳ Logging in...' : "Let's Go!"}
          </button>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
