import React, { useState, useEffect } from 'react';
import { verifyEmail, resendVerification } from '../services/api';

const Verify = ({ email, onVerificationSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await verifyEmail(email, code);
      setMessage('Email verified successfully!');
      onVerificationSuccess();
    } catch (err) {
      setError(err.detail || 'An error occurred. Please try again.');
      if (err.detail.includes('expired')) {
        handleResend();
      }
    }
  };

  const handleResend = async () => {
    if (resendDisabled) return;

    setResendDisabled(true);
    setResendTimer(60);
    setError('');
    setMessage('');

    try {
      await resendVerification(email);
      setMessage('A new verification code has been sent to your email.');
    } catch (err) {
      setError(err.detail || 'Failed to resend verification code. Please try again later.');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            type="text"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Verify Email
        </button>
      </form>
      <button
        onClick={handleResend}
        disabled={resendDisabled}
        className={`mt-4 text-blue-500 hover:underline ${resendDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {resendDisabled ? `Resend in ${resendTimer}s` : 'Resend Verification Code'}
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {message && <p className="text-green-500 mt-4">{message}</p>}
    </div>
  );
};

export default Verify;