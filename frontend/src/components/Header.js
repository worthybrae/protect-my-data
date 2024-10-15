import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">User Management</Link>
        <nav>
          {user ? (
            <>
              <Link to="/profile" className="mr-4">Profile</Link>
              <button onClick={handleSignOut} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/auth" className="mr-4">Sign In</Link>
              <Link to="/signup" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;