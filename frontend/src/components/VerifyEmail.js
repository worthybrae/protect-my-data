import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const VerifyEmail = () => {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { email_id, email_address } = location.state || {};
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email_id || !email_address) {
      navigate('/profile');
    }
  }, [email_id, email_address, navigate]);

  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleInputChange = (index, value) => {
    // Convert value to uppercase and remove non-uppercase letters
    const uppercaseValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newCode = [...verificationCode];
    newCode[index] = uppercaseValue;
    setVerificationCode(newCode);
  
    // Move to next input if value is entered
    if (uppercaseValue !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (pastedData.length === 6 && /^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setVerificationCode(newCode);
      inputRefs.current[5].focus(); // Focus the last input after pasting
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const code = verificationCode.join('');

    try {
      console.log('Starting email verification process for email_id:', email_id);

      // Fetch the email record
      const { data: emailRecord, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .eq('id', email_id)
        .single();

      if (fetchError) {
        console.error('Error fetching email record:', fetchError);
        throw new Error('Email not found');
      }

      console.log('Fetched email record:', emailRecord);

      if (emailRecord.status !== 'pending') {
        throw new Error('Email already verified or disabled');
      }

      if (new Date(emailRecord.verification_code_expires_at) < new Date()) {
        throw new Error('Verification code has expired');
      }

      // Hash the input verification code
      const hashedInputCode = await hashCode(code);
      console.log('Hashed input code:', hashedInputCode);
      console.log('Stored hashed code:', emailRecord.verification_code);

      if (hashedInputCode !== emailRecord.verification_code) {
        throw new Error('Invalid verification code');
      }

      // Update the email record
      const { error: updateError } = await supabase
        .from('emails')
        .update({
          status: 'active',
          verification_code: null,
          verification_code_expires_at: null
        })
        .eq('id', email_id);

      if (updateError) {
        console.error('Error updating email record:', updateError);
        throw updateError;
      }

      console.log('Update operation completed');

      // Verify the update by fetching the record again
      const { data: verifiedData, error: verifyError } = await supabase
        .from('emails')
        .select('*')
        .eq('id', email_id)
        .single();

      if (verifyError) {
        console.error('Error verifying update:', verifyError);
        throw new Error('Failed to verify update');
      }

      console.log('Verified updated data:', verifiedData);

      if (verifiedData.status !== 'active') {
        throw new Error('Update failed: status not changed to active');
      }

      alert('Email verified successfully!');
      navigate('/profile');
    } catch (error) {
      setError(error.message);
      console.error('Error in email verification process:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a 6-character code to {email_address}. The code expires in 5 minutes.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="flex justify-between">
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength="1"
                className="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                
              />
            ))}
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-sm text-gray-600">
          Can't find your code? Check your spam folder!
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;