import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './pages/ProfileSetup';
import RegisterVehicle from './pages/RegisterVehicle';
import PublicScan from './pages/PublicScan';
import AdminLayout from './layouts/AdminLayout';
import Verifications from './pages/admin/Verifications';

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

        {/* Admin — role guard is inside AdminLayout */}
        <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/admin/verifications" replace />} />
          <Route path="verifications" element={<Verifications />} />
        </Route>

        {/* Public scan page — no auth required */}
        <Route path="/v/:vehicleId" element={<PublicScan />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
