import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../../services/authService';
import { getDashboardRouteByRole, setAuthSession } from '../../services/authStorage';

/**
 * Registration Component
 * Allows new users to create an account
 */

function Register() {
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState('Student');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const profiles = [
    { id: 'Student', label: 'Student', icon: '🎒', color: 'bg-pink-500 hover:bg-pink-600' },
    { id: 'Teacher', label: 'Teacher', icon: '🍎', color: 'bg-red-500 hover:bg-red-600' },
    { id: 'Parent', label: 'Parent', icon: '👨‍👩‍👧', color: 'bg-gray-500 hover:bg-gray-600' },
    { id: 'Admin', label: 'Admin', icon: '🛡️', color: 'bg-slate-700 hover:bg-slate-800' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerUser({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: selectedProfile
      });

      if (!result?.token || !result?.user) {
        throw new Error('Registration response is missing token or user data.');
      }

      setAuthSession({ token: result.token, user: result.user });
      navigate(getDashboardRouteByRole(result.user.role));
    } catch (error) {
      console.error('Registration error:', error);
      const message = error?.response?.data?.message || error.message || 'Registration failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        {/* Star Icon */}
        <div className="flex justify-center mb-6">
          <div className="text-6xl animate-pulse">⭐</div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-2">
          Join Us!
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Create your account to start learning
        </p>

        <form onSubmit={handleRegister}>
          {/* Profile Selection */}
          <div className="flex gap-3 mb-6">
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

          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm font-semibold mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Abebe Bekele"
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:bg-white focus:outline-none transition-all text-gray-800"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="abebe@email.com"
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:bg-white focus:outline-none transition-all text-gray-800"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-gray-600 text-sm font-semibold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:bg-white focus:outline-none transition-all text-gray-800"
            />
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-gray-600 text-sm font-semibold mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:bg-white focus:outline-none transition-all text-gray-800"
            />
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all duration-200 shadow-lg ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-success-500 to-primary-600 hover:from-success-600 hover:to-primary-700 hover:shadow-xl'
            }`}
          >
            {isLoading ? '⏳ Creating account...' : '🎉 Create Account'}
          </button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600 text-sm">Already have an account? </span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary-500 hover:text-primary-600 font-bold text-sm"
            >
              Login here
            </button>
          </div>

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

export default Register;
