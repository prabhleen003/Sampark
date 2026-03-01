import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './pages/ProfileSetup';
import RegisterVehicle from './pages/RegisterVehicle';
import PublicScan from './pages/PublicScan';
import PrintCard from './pages/PrintCard';
import OrderCard from './pages/OrderCard';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AdminLayout from './layouts/AdminLayout';
import Verifications from './pages/admin/Verifications';
import AdminOrders from './pages/admin/Orders';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<Landing />} />
        <Route path="/login"             element={<Login />} />
        <Route path="/profile-setup"     element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />
        <Route path="/dashboard"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/vehicles/register" element={<PrivateRoute><RegisterVehicle /></PrivateRoute>} />
        <Route path="/vehicles/resubmit/:vehicleId" element={<PrivateRoute><RegisterVehicle resubmit /></PrivateRoute>} />
        <Route path="/print/:vehicleId"      element={<PrivateRoute><PrintCard /></PrivateRoute>} />
        <Route path="/order-card/:vehicleId" element={<PrivateRoute><OrderCard /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/settings"      element={<PrivateRoute><Settings /></PrivateRoute>} />

        {/* Admin — role guard is inside AdminLayout */}
        <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/admin/verifications" replace />} />
          <Route path="verifications" element={<Verifications />} />
          <Route path="orders"        element={<AdminOrders />} />
        </Route>

        {/* Public scan page — no auth required */}
        <Route path="/v/:vehicleId" element={<PublicScan />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
