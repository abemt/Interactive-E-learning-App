import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../services/authService';
import {
  clearAuthSession,
  getAuthUser,
  getDashboardRouteByRole,
  setAuthSession
} from '../../services/authStorage';

const PASSWORD_MIN_LENGTH = 8;

const validateNewPassword = (value) => {
  const password = String(value || '');
  const messages = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    messages.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  if (!/[a-z]/.test(password)) {
    messages.push('Include at least one lowercase letter.');
  }

  if (!/[A-Z]/.test(password)) {
    messages.push('Include at least one uppercase letter.');
  }

  if (!/\d/.test(password)) {
    messages.push('Include at least one number.');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    messages.push('Include at least one special character.');
  }

  return messages;
};

function ForceChangePassword() {
  const navigate = useNavigate();
  const authUser = getAuthUser();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const passwordViolations = validateNewPassword(newPassword);
    if (passwordViolations.length > 0) {
      setErrorMessage(passwordViolations.join(' '));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword
      });

      if (!result?.user) {
        throw new Error('Password change response is missing user data.');
      }

      setAuthSession({ user: result.user });
      navigate(getDashboardRouteByRole(result.user.role), { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error.message ||
        'Unable to update password. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100 to-indigo-100 p-6">
      <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-indigo-100 bg-white p-8 shadow-2xl">
          <h1 className="mb-2 text-center text-3xl font-extrabold text-gray-900">Change Your Password</h1>
          <p className="mb-6 text-center text-sm text-gray-700">
            As stated in the credential PDF document, you must change your temporary password before you can access your dashboard.
          </p>

          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Signed in as <strong>{authUser?.email || 'authenticated user'}</strong>.
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="currentPassword">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="newPassword">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
              />
              <p className="mt-2 text-xs text-gray-600">
                Use at least 8 characters with uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="confirmNewPassword">
                Confirm New Password
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                required
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full rounded-xl py-3 text-base font-bold text-white transition ${
                isSubmitting
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-4 w-full rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForceChangePassword;
