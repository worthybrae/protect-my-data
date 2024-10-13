// src/App.js
import React, { useState, useEffect } from 'react';
import { CookiesProvider, useCookies } from 'react-cookie';
import Header from './components/Header';
import AuthForms from './components/AuthForms';
import Verify from './components/Verify';
import { getCurrentUser, checkVerification } from './services/api';

const App = () => {
  const [cookies, setCookie, removeCookie] = useCookies(['auth_token']);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      if (cookies.auth_token) {
        try {
          const userData = await getCurrentUser(cookies.auth_token);
          setUser(userData);
          const verificationStatus = await checkVerification(userData.email);
          setNeedsVerification(!verificationStatus.is_verified);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          removeCookie('auth_token');
        }
      }
    };

    fetchUser();
  }, [cookies.auth_token, removeCookie]);

  const handleLogin = async (token, email) => {
    setCookie('auth_token', token, {
      path: '/',
      maxAge: 3600,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });
    const verificationStatus = await checkVerification(email);
    if (!verificationStatus.is_verified) {
      setNeedsVerification(true);
      setVerificationEmail(email);
    } else {
      setAuthMode(null);
    }
  };

  const handleLogout = () => {
    removeCookie('auth_token');
    setUser(null);
    setNeedsVerification(false);
    setVerificationEmail('');
  };

  const handleVerificationSuccess = () => {
    setNeedsVerification(false);
    setAuthMode(null);
    setVerificationEmail('');
  };

  const handleNeedVerification = (email) => {
    setNeedsVerification(true);
    setVerificationEmail(email);
    setAuthMode(null);
  };

  return (
    <CookiesProvider>
      <div className="min-h-screen bg-gray-100">
        <Header 
          user={user} 
          onSignInClick={() => setAuthMode('signin')}
          onSignUpClick={() => setAuthMode('signup')}
          onLogout={handleLogout}
        />
        <main className="container mx-auto px-4 py-8">
          {!user && authMode && (
            <AuthForms 
              mode={authMode} 
              onLogin={handleLogin}
              onModeChange={setAuthMode}
              onRegisterSuccess={(email) => {
                setNeedsVerification(true);
                setVerificationEmail(email);
                setAuthMode(null);
              }}
              onNeedVerification={handleNeedVerification}
            />
          )}
          {needsVerification && (
            <Verify 
              email={verificationEmail} 
              onVerificationSuccess={handleVerificationSuccess}
            />
          )}
          {user && !needsVerification && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Welcome, {user.email}!</h2>
              {/* Add user dashboard content here */}
            </div>
          )}
        </main>
      </div>
    </CookiesProvider>
  );
};

export default App;