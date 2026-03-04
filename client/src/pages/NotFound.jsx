import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl font-bold text-teal-500 mb-4">404</div>
        <h1 className="text-white text-xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <button
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          className="bg-teal-500 text-white px-6 py-3 rounded-lg font-medium"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Home'}
        </button>
      </div>
    </div>
  );
}
