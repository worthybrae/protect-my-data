import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children, authRequired = true }) => {
  const { user } = useAuth();

  if (authRequired && !user) {
    return <Navigate to="/signin" />;
  }

  if (!authRequired && user) {
    return <Navigate to="/profile" />;
  }

  return children;
};

export default PrivateRoute;