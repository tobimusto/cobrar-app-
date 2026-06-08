import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
import Catalog from './pages/Catalog';
import Providers from './pages/Providers';
import OnlineStore from './pages/OnlineStore';
import FAQ from './pages/FAQ';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import SuperAdmin from './pages/SuperAdmin';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const RoleGuard = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();
  
  if (loading) return null;

  const userRole = profile?.role || 'Propietario';

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/pos" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a23',
            color: '#fff',
            border: '1px solid #2A2A4A',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/c/:slugOrId" element={<Catalog />} />
          <Route path="/online-store/:storeId" element={<OnlineStore />} />
          
          <Route path="/superadmin" element={
            <ProtectedRoute>
              <SuperAdmin />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/pos" replace />} />
            
            {/* Rutas de acceso global para cualquier rol autenticado */}
            <Route path="pos" element={<POS />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="support" element={<div>Soporte (Construcción)</div>} />

            {/* Rutas: Empleado, Empleado PLUS, Gerente, Propietario */}
            <Route path="inventory" element={<RoleGuard allowedRoles={['Propietario', 'Gerente', 'Empleado PLUS', 'Empleado']}><Inventory /></RoleGuard>} />
            <Route path="inventory/new" element={<RoleGuard allowedRoles={['Propietario', 'Gerente', 'Empleado PLUS', 'Empleado']}><NewProduct /></RoleGuard>} />
            <Route path="clients" element={<RoleGuard allowedRoles={['Propietario', 'Gerente', 'Empleado PLUS', 'Empleado']}><Clients /></RoleGuard>} />
            <Route path="purchases" element={<RoleGuard allowedRoles={['Propietario', 'Gerente', 'Empleado PLUS', 'Empleado']}><Purchases /></RoleGuard>} />

            {/* Rutas: Empleado PLUS, Gerente, Propietario */}
            <Route path="reports" element={<RoleGuard allowedRoles={['Propietario', 'Gerente', 'Empleado PLUS']}><Reports /></RoleGuard>} />
            <Route path="movements" element={<RoleGuard allowedRoles={['Propietario', 'Gerente', 'Empleado PLUS']}><Movements /></RoleGuard>} />

            {/* Rutas Administrativas: Gerente, Propietario */}
            <Route path="users" element={<RoleGuard allowedRoles={['Propietario', 'Gerente']}><Users /></RoleGuard>} />
            <Route path="providers" element={<RoleGuard allowedRoles={['Propietario', 'Gerente']}><Providers /></RoleGuard>} />
            <Route path="settings" element={<RoleGuard allowedRoles={['Propietario', 'Gerente']}><Settings /></RoleGuard>} />
            <Route path="store" element={<RoleGuard allowedRoles={['Propietario', 'Gerente']}><OnlineStore /></RoleGuard>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
