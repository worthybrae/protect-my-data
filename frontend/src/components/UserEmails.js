import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const UserEmails = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmails();
  }, [user.id]);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setEmails(data);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError('Failed to fetch emails. Please try again.');
    }
  };

  const addEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // First, send the verification email
      const response = await fetch(`${API_URL}/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_address: newEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send verification email');
      }

      const { hashed_code } = await response.json();

      // Then, add the email to Supabase with the hashed verification code
      const { data, error } = await supabase
        .from('emails')
        .insert({
          user_id: user.id,
          email_address: newEmail,
          status: 'pending',
          verification_code: hashed_code,
          verification_code_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        })
        .select();

      if (error) throw error;

      console.log('Email added and verification sent successfully');
      setNewEmail('');
      fetchEmails();
      navigate('/verify-email', { state: { email_id: data[0].id, email_address: newEmail } });
    } catch (error) {
      console.error('Error adding email:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Your Emails</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <ul className="mb-4">
        {emails.map((email) => (
          <li key={email.id} className="flex justify-between items-center mb-2">
            <span>{email.email_address}</span>
            <span className={`text-sm ${email.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
              {email.status}
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={addEmail} className="space-y-4">
        <div>
          <label htmlFor="newEmail" className="block mb-1">Add New Email</label>
          <input
            type="email"
            id="newEmail"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Email'}
        </button>
      </form>
    </div>
  );
};

export default UserEmails;