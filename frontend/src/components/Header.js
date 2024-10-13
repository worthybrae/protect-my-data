// src/components/Header.js
import React from 'react';
import { UserIcon } from '@heroicons/react/24/solid';

const Header = ({ user, onSignInClick, onSignUpClick, onLogout }) => {
  return (
    <header className="bg-blue-600 text-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Protect My Data</h1>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span>{user.email}</span>
              <UserIcon className="h-6 w-6 text-white cursor-pointer" onClick={onLogout} />
            </>
          ) : (
            <>
              <button
                onClick={onSignInClick}
                className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-100 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onSignUpClick}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-400 transition-colors"
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;