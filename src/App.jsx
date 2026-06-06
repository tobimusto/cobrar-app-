import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import NewProduct from './pages/NewProduct';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Purchases from './pages/Purchases';
import Movements from './pages/Movements';
import Settings from './pages/Settings';
import Login from './pages/Login';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="pos" element={<POS />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/new" element={<NewProduct />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="clients" element={<Clients />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="movements" element={<Movements />} />
            <Route path="settings" element={<Settings />} />
            <Route path="support" element={<div>Soporte (Construcción)</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
