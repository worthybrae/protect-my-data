import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const UserEmails = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchEmails = useCallback(async () => {
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
  }, [user.id]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const addEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
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
      setShowAddEmail(false);
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
    <div className="bg-white bg-opacity-10 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Your Emails</h2>
      {error && <p className="text-red-300 mb-4">{error}</p>}
      <ul className="mb-4 space-y-2">
        {emails.map((email) => (
          <li key={email.id} className="flex justify-between items-center">
            <span>{email.email_address}</span>
            <span className={`text-sm ${email.status === 'active' ? 'text-green-300' : 'text-yellow-300'}`}>
              {email.status}
            </span>
          </li>
        ))}
      </ul>
      {!showAddEmail && (
        <button
          onClick={() => setShowAddEmail(true)}
          className="flex items-center text-white hover:text-gray-200 transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 4v16m8-8H4"></path>
          </svg>
          Add Email
        </button>
      )}
      {showAddEmail && (
        <form onSubmit={addEmail} className="mt-4 space-y-4">
          <div>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded text-white placeholder-gray-300"
              placeholder="Enter new email"
              required
            />
          </div>
          <div className="flex space-x-2">
            <button 
              type="submit" 
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors duration-200 disabled:bg-indigo-400"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Email'}
            </button>
            <button 
              type="button" 
              onClick={() => setShowAddEmail(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserEmails;