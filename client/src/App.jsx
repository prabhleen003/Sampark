import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import RegisterVehicle from './pages/RegisterVehicle';
import PrintCard from './pages/PrintCard';
import ClaimVehicle from './pages/ClaimVehicle';
import OrderCard from './pages/OrderCard';
import Notifications from './pages/Notifications';
import MyTickets from './pages/MyTickets';
import TicketDetail from './pages/TicketDetail';
import AdminLayout from './layouts/AdminLayout';
import HelpButton from './components/HelpButton';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import NotFound from './pages/NotFound';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));
const PublicScan = lazy(() => import('./pages/PublicScan'));
const Verifications = lazy(() => import('./pages/admin/Verifications'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AbuseReports = lazy(() => import('./pages/admin/AbuseReports'));
const BlocklistPage = lazy(() => import('./pages/admin/Blocklist'));
const PublicReports = lazy(() => import('./pages/admin/PublicReports'));
const AdminSupport = lazy(() => import('./pages/admin/Support'));
const AdminSupportDetail = lazy(() => import('./pages/admin/SupportDetail'));

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ScanPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="w-48 h-8 bg-gray-200 rounded animate-pulse mb-8" />
      <div className="w-full max-w-sm space-y-4">
        <div className="h-14 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-14 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-14 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function AppChrome() {
  const location = useLocation();
  const isAuthed = !!localStorage.getItem('token');
  const onPublicScan = location.pathname.startsWith('/v/');
  const onLogin = location.pathname === '/login';
  const showInstallPrompt = isAuthed && !onPublicScan && !onLogin;
  const showHelpButton = !onPublicScan;

  return (
    <>
      <OfflineBanner />
      {showHelpButton && <HelpButton />}
      {showInstallPrompt && <InstallPrompt />}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile-setup" element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />
        <Route path="/vehicles/register" element={<PrivateRoute><RegisterVehicle /></PrivateRoute>} />
        <Route path="/vehicles/resubmit/:vehicleId" element={<PrivateRoute><RegisterVehicle resubmit /></PrivateRoute>} />
        <Route path="/vehicles/claim" element={<PrivateRoute><ClaimVehicle /></PrivateRoute>} />
        <Route path="/print/:vehicleId" element={<PrivateRoute><PrintCard /></PrivateRoute>} />
        <Route path="/order-card/:vehicleId" element={<PrivateRoute><OrderCard /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/support/tickets" element={<PrivateRoute><MyTickets /></PrivateRoute>} />
        <Route path="/support/tickets/:ticketId" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            </PrivateRoute>
          }
        />

        <Route
          path="/help"
          element={
            <Suspense fallback={<PageLoader />}>
              <Help />
            </Suspense>
          }
        />

        <Route
          path="/v/:vehicleId"
          element={
            <Suspense fallback={<ScanPageLoader />}>
              <PublicScan />
            </Suspense>
          }
        />

        <Route
          path="/admin"
          element={<PrivateRoute><AdminLayout /></PrivateRoute>}
        >
          <Route index element={<Navigate to="/admin/verifications" replace />} />
          <Route path="verifications" element={<Suspense fallback={<PageLoader />}><Verifications /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><AdminOrders /></Suspense>} />
          <Route path="abuse-reports" element={<Suspense fallback={<PageLoader />}><AbuseReports /></Suspense>} />
          <Route path="blocklist" element={<Suspense fallback={<PageLoader />}><BlocklistPage /></Suspense>} />
          <Route path="public-reports" element={<Suspense fallback={<PageLoader />}><PublicReports /></Suspense>} />
          <Route path="support" element={<Suspense fallback={<PageLoader />}><AdminSupport /></Suspense>} />
          <Route path="support/:ticketId" element={<Suspense fallback={<PageLoader />}><AdminSupportDetail /></Suspense>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppChrome />
    </BrowserRouter>
  );
}
