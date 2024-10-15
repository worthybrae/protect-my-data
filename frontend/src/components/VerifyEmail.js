import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const VerifyEmail = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { email_id, email_address } = location.state || {};

  // SHA-256 hashing function using Web Crypto API
  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Fetch the email record
      const { data: emailRecord, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .eq('id', email_id)
        .single();

      if (fetchError) throw new Error('Email not found');

      if (emailRecord.status !== 'pending') {
        throw new Error('Email already verified or disabled');
      }

      if (new Date(emailRecord.verification_code_expires_at) < new Date()) {
        throw new Error('Verification code has expired');
      }

      // Hash the input verification code
      const hashedInputCode = await hashCode(verificationCode);

      if (hashedInputCode !== emailRecord.verification_code) {
        throw new Error('Invalid verification code');
      }

      // Update the email record
      const { error: updateError } = await supabase
        .from('emails')
        .update({
          status: 'active',
          verification_code: null,
          verification_code_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', email_id);

      console.log('email has been updated in supa');

      if (updateError) throw updateError;

      alert('Email verified successfully!');
      navigate('/profile');
    } catch (error) {
      setError(error.message);
      console.error('Error verifying email:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!email_id || !email_address) {
    return <div>No email to verify. Please go back and try again.</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Verify Email</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <p className="mb-4">Please enter the verification code sent to {email_address}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="verificationCode" className="block mb-1">Verification Code</label>
          <input
            type="text"
            id="verificationCode"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>
    </div>
  );
};

export default VerifyEmail;