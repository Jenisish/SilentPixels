import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, Lock, Mail, Eye, EyeOff } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface LoginProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onLogin();
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      setSuccess(null);
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccess('Password reset email sent. Check your inbox.');
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to send reset email');
      setSuccess(null);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    try {
      setError(null);
      setSuccess(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError((err as Error).message || 'OAuth sign-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center mb-8">
          <img src="./src/public/blue.jpg" alt="Logo" className="mx-auto w-20 h-20 object-contain mb-4" />
          <img src="./src/public/log.png" alt="SilentPixels" className="mx-auto w-80 h-auto object-contain mb-4" />
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                <a href="#" onClick={handleForgotPassword} className="text-blue-600 hover:underline">
                  Forgot Password?
                </a>
              </p>
            </div>
            {error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center gap-2 text-green-700">
                <Mail className="w-5 h-5" />
                {success}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-blue-400"
              disabled={isLoading}
            >
              <Lock className="w-4 h-4" />
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="mt-6">
            <p className="text-center text-gray-600 mb-4">Or continue with</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleOAuthSignIn('google')}
                className="py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-3"
                aria-label="Sign in with Google"
              >
                <img src="./src/public/google.png" alt="Google" className="w-5 h-5" />
                Google
              </button>
              <button
                onClick={() => handleOAuthSignIn('azure')}
                className="py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-3"
                aria-label="Sign in with Azure"
              >
                <img src="./src/public/microsoft.png" alt="Azure" className="w-5 h-5" />
                Azure
              </button>
            </div>
          </div>
          <p className="mt-4 text-center text-gray-600">
            Don’t have an account?{' '}
            <button onClick={onSwitchToSignup} className="text-blue-600 hover:underline">
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};