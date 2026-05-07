'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="rounded-full bg-red-50 p-4 mb-6">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Something went wrong
      </h1>
      <p className="text-gray-500 mb-8 max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
