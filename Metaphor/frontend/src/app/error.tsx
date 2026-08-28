'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-zinc-50 font-mono p-4">
      <h2 className="text-xl font-bold mb-4">System Error</h2>
      <pre className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 p-4 rounded-lg overflow-auto max-w-lg text-left mb-6">
        {error.message}
      </pre>
      <button
        className="px-4 py-2 bg-zinc-100 text-zinc-900 font-semibold rounded hover:bg-zinc-200 transition-colors"
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Retry
      </button>
    </div>
  );
}
