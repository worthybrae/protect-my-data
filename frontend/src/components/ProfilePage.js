import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const ProfilePage = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: emailsData, error: emailsError } = await supabase
        .from('emails')
        .select('id, email_address, status, created_at')
        .eq('user_id', user.id);

      if (emailsError) throw emailsError;
      setEmails(emailsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out. Please try again.');
    }
  };

  const getTimeSince = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const { error } = await supabase
        .from('emails')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setEmails((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );
    } catch (error) {
      console.error('Error updating email status:', error);
      setError('Failed to update email status. Please try again.');
    }
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      const response = await fetch(`${API_URL}/send-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: newEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || 'Failed to send verification email'
        );
      }

      const { hashed_code } = await response.json();

      const { data, error } = await supabase
        .from('emails')
        .insert([
          {
            user_id: user.id,
            email_address: newEmail,
            status: 'pending',
            verification_code: hashed_code,
            verification_code_expires_at: new Date(
              Date.now() + 5 * 60 * 1000
            ).toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      setEmails([...emails, data[0]]);
      setNewEmail('');
      setShowAddEmail(false);
      navigate('/verify-email', {
        state: { email_id: data[0].id, email_address: newEmail },
      });
    } catch (error) {
      console.error('Error adding email:', error);
      setError('Failed to add email. Please try again.');
    }
  };

  const handleVerifyEmail = async (emailId, emailAddress) => {
    try {
      const response = await fetch(`${API_URL}/send-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: emailAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || 'Failed to send verification email'
        );
      }

      const { hashed_code } = await response.json();

      const { error } = await supabase
        .from('emails')
        .update({
          verification_code: hashed_code,
          verification_code_expires_at: new Date(
            Date.now() + 5 * 60 * 1000
          ).toISOString(),
        })
        .eq('id', emailId);

      if (error) throw error;

      navigate('/verify-email', {
        state: { email_id: emailId, email_address: emailAddress },
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      setError('Failed to send verification email. Please try again.');
    }
  };

  const renderList = (items) => (
    <div className="space-y-4 w-full">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white shadow-sm border border-gray-200 rounded-lg p-4 flex w-full"
        >
          {/* Left side: Verify button for unverified emails */}
          {item.status !== 'active' && (
            <div className="mr-4">
              <button
                onClick={() =>
                  handleVerifyEmail(item.id, item.email_address)
                }
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-purple-600 text-white hover:bg-purple-700"
              >
                Verify
              </button>
            </div>
          )}
          {/* Right side: Email details */}
          <div className="flex-grow flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900 flex items-center">
                {item.email_address}
                {item.status === 'active' && (
                  <svg
                    className="w-5 h-5 text-green-500 ml-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414L8 15.414l-4.293-4.293a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </p>
              <p className="text-xs text-gray-500">
                Added {getTimeSince(item.created_at)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : item.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
              {item.status === 'active' && (
                <button
                  onClick={() => handleToggleStatus(item.id, item.status)}
                  className="text-red-600 hover:text-red-800 focus:outline-none"
                  title="Disable"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 11-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading)
    return <div className="text-center mt-8 text-gray-500">Loading...</div>;
  if (error)
    return <div className="text-center mt-8 text-red-500">{error}</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-purple-900">Data Shield</h1>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-screen-xl mx-auto w-full py-6 px-4 sm:px-6 lg:px-8">
        {/* User Info */}
        <section className="mb-8">
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-purple-900">
              Welcome, {user?.email}
            </h2>
          </div>
        </section>

        {/* Emails Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-purple-900">Emails</h2>
            {!showAddEmail ? (
              <button
                onClick={() => setShowAddEmail(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                </svg>
                Add Email
              </button>
            ) : (
              <form onSubmit={handleAddEmail} className="flex space-x-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter new email"
                  required
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmail(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
          {renderList(emails)}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-screen-xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; 2024 Data Shield. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ProfilePage;

