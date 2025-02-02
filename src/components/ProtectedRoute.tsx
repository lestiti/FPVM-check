import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import AdminLogin from '../components/AdminLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, login } = useAdminAuth();
  const [showLogin, setShowLogin] = useState(true);

  if (!isAuthenticated || showLogin) {
    return (
      <AdminLogin 
        onLoginSuccess={() => {
          login();
          setShowLogin(false);
        }} 
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;