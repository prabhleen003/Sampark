import { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError('Could not reach server'));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="rounded-xl border border-gray-800 p-8 text-center">
        <h1 className="mb-4 text-3xl font-bold">Sampark</h1>
        {error && <p className="text-red-400">{error}</p>}
        {health && (
          <div className="space-y-1 text-sm text-gray-300">
            <p>API: <span className="text-green-400">{health.status}</span></p>
            <p>DB: <span className={health.db === 'connected' ? 'text-green-400' : 'text-yellow-400'}>{health.db}</span></p>
          </div>
        )}
        {!health && !error && <p className="text-gray-500">Connecting...</p>}
      </div>
    </div>
  );
}
