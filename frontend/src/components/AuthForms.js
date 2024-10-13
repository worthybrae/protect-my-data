// src/components/AuthForms.js
import React, { useState } from 'react';
import { login, register, forgotPassword } from '../services/api';

const AuthForms = ({ mode, onLogin, onModeChange, onRegisterSuccess, onNeedVerification }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setMessage('');
  
      try {
        if (mode === 'signin') {
          const { data, status, message } = await login(email, password);
          if (status === 403) {
            onNeedVerification(email);
          } else if (data && data.access_token) {
            onLogin(data.access_token, email);
          } else {
            setError(message || 'An error occurred during login.');
          }
        } else if (mode === 'signup') {
          if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
          }
          await register(email, password);
          setMessage('Account created successfully. Please check your email for verification.');
          onRegisterSuccess(email);
        } else if (mode === 'forgotPassword') {
          await forgotPassword(email);
          setMessage('Password reset instructions sent to your email.');
        }
      } catch (err) {
        setError(err.detail || 'An error occurred. Please try again.');
      }
    };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <h2 className="text-2xl font-bold mb-4">
        {mode === 'signin' && 'Sign In'}
        {mode === 'signup' && 'Create Account'}
        {mode === 'forgotPassword' && 'Forgot Password'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            required
          />
        </div>
        {mode !== 'forgotPassword' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            />
          </div>
        )}
        {mode === 'signup' && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            />
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {mode === 'signin' && 'Sign In'}
          {mode === 'signup' && 'Create Account'}
          {mode === 'forgotPassword' && 'Reset Password'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {message && <p className="text-green-500 mt-4">{message}</p>}
      <div className="mt-4 text-center">
        {mode !== 'signin' && (
          <button
            onClick={() => onModeChange('signin')}
            className="text-blue-500 hover:underline"
          >
            Sign In
          </button>
        )}
        {mode !== 'signup' && (
          <button
            onClick={() => onModeChange('signup')}
            className="text-blue-500 hover:underline ml-4"
          >
            Create Account
          </button>
        )}
        {mode !== 'forgotPassword' && (
          <button
            onClick={() => onModeChange('forgotPassword')}
            className="text-blue-500 hover:underline ml-4"
          >
            Forgot Password
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthForms;