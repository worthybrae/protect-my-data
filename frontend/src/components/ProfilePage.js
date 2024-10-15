import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const ProfilePage = () => {
  const [emails, setEmails] = useState([]);
  const [devices, setDevices] = useState([]);
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

      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('id, advertising_id, status, created_at')
        .eq('user_id', user.id);

      if (devicesError) throw devicesError;
      setDevices(devicesData);
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

  const handleToggleStatus = async (id, type, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const { error } = await supabase
        .from(type === 'email' ? 'emails' : 'devices')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      const updateItems = type === 'email' ? setEmails : setDevices;
      updateItems(prevItems => 
        prevItems.map(item => 
          item.id === id ? { ...item, status: newStatus } : item
        )
      );
    } catch (error) {
      console.error(`Error updating ${type} status:`, error);
      setError(`Failed to update ${type} status. Please try again.`);
    }
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
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
        .insert([
          { 
            user_id: user.id, 
            email_address: newEmail, 
            status: 'pending',
            verification_code: hashed_code,
            verification_code_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          }
        ])
        .select();

      if (error) throw error;

      setEmails([...emails, data[0]]);
      setNewEmail('');
      setShowAddEmail(false);
      navigate('/verify-email', { state: { email_id: data[0].id, email_address: newEmail } });
    } catch (error) {
      console.error('Error adding email:', error);
      setError('Failed to add email. Please try again.');
    }
  };

  const handleVerifyEmail = async (emailId, emailAddress) => {
    try {
      const response = await fetch(`${API_URL}/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_address: emailAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send verification email');
      }

      const { hashed_code } = await response.json();

      const { error } = await supabase
        .from('emails')
        .update({ 
          verification_code: hashed_code,
          verification_code_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        })
        .eq('id', emailId);

      if (error) throw error;

      navigate('/verify-email', { state: { email_id: emailId, email_address: emailAddress } });
    } catch (error) {
      console.error('Error sending verification email:', error);
      setError('Failed to send verification email. Please try again.');
    }
  };

  const renderList = (items, type) => (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200">
          <div className="flex items-center space-x-2 flex-grow">
            <span className="text-indigo-800 font-medium">
              {type === 'email' ? item.email_address : item.advertising_id}
            </span>
            {item.status === 'active' && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
            {item.status !== 'active' && (
              <button
                onClick={() => handleVerifyEmail(item.id, item.email_address)}
                className="ml-2 text-xs bg-yellow-500 text-white px-2 py-1 rounded transition-colors hover:bg-yellow-600 whitespace-nowrap"
              >
                Verify
              </button>
            )}
          </div>
          <div className="flex items-center space-x-4 ml-4">
            <span className="text-xs text-gray-500 whitespace-nowrap">{getTimeSince(item.created_at)}</span>
            <div className={`px-3 py-1 rounded-full text-xs text-white whitespace-nowrap ${
              item.status === 'active' ? 'bg-green-500' :
              item.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 bg-white`}></span>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </div>
            {item.status === 'active' && (
              <button 
                onClick={() => handleToggleStatus(item.id, type, item.status)}
                className="text-red-500 hover:text-red-700"
                title="Disable"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) return <div className="text-center mt-8 text-white">Loading...</div>;
  if (error) return <div className="text-center mt-8 text-red-300">{error}</div>;

  return (
    <div className="flex flex-col min-h-screen bg-indigo-600">
      <div className="flex-grow p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Data Shield</h1>
          
          <div className="bg-white p-6 rounded-lg mb-8 shadow-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-indigo-600">{user?.email}</h2>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg mb-8 shadow-lg">
            <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Emails</h2>
            {renderList(emails, 'email')}
            <div className="mt-4">
              {!showAddEmail ? (
                <button
                  onClick={() => setShowAddEmail(true)}
                  className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 4v16m8-8H4"></path>
                  </svg>
                  Add Email
                </button>
              ) : (
                <form onSubmit={handleAddEmail} className="flex items-center space-x-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-grow px-3 py-2 bg-white text-indigo-600 border border-indigo-300 rounded placeholder-indigo-400"
                    placeholder="Enter new email"
                    required
                  />
                  <button 
                    type="submit" 
                    className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors duration-200"
                  >
                    Add
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAddEmail(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg mb-8 shadow-lg">
            <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Devices</h2>
            {renderList(devices, 'device')}
          </div>
        </div>
      </div>
      
      <footer className="bg-indigo-700 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-white">
            &copy; 2024 Data Shield. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ProfilePage;