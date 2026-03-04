export default function AsyncState({
  loading,
  error,
  empty,
  emptyMessage,
  children,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-teal-500 underline">
            Try again
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">{emptyMessage || 'Nothing here yet.'}</p>
      </div>
    );
  }

  return children;
}
