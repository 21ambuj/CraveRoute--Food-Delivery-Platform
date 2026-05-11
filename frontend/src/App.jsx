import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/public/LandingPage';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import RestaurantMenu from './pages/customer/RestaurantMenu';
import VendorDashboard from './pages/vendor/VendorDashboard';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';


// The Ultimate Role-Based Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  
  return children;
};



// Intelligent Home Component: Redirects logged-in users to their respective dashboards
const Home = () => {
  const { user } = useContext(AuthContext);
  
  if (user) {
    switch (user.role) {
      case 'customer': return <Navigate to="/customer" />;
      case 'vendor': return <Navigate to="/vendor" />;
      case 'delivery': return <Navigate to="/delivery" />;
      case 'admin': return <Navigate to="/admin" />;
      default: return <LandingPage />;
    }
  }
  return <LandingPage />;
};

function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#333',
            color: '#fff',
            fontWeight: '600',
            fontSize: '14px',
            padding: '12px 20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff',
            },
          },
        }}
      />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 1. Customer Dashboard */}
          <Route path="/customer" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/customer/restaurant/:id" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <RestaurantMenu />
            </ProtectedRoute>
          } />

          {/* 2. Shopkeeper (Vendor) Dashboard */}
          <Route path="/vendor/*" element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <VendorDashboard />
            </ProtectedRoute>
          } />

          {/* 3. Delivery Dashboard */}
          <Route path="/delivery/*" element={
            <ProtectedRoute allowedRoles={['delivery']}>
              <DeliveryDashboard />
            </ProtectedRoute>
          } />

          {/* 4. Super Admin Dashboard */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
