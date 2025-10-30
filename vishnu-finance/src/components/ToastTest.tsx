'use client';

import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/button';

export default function ToastTest() {
  const { success, error, warning, info } = useToast();

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-lg font-semibold">Toast Test</h3>
      <div className="flex space-x-2">
        <Button onClick={() => success('Success!', 'This is a success message')}>
          Success Toast
        </Button>
        <Button onClick={() => error('Error!', 'This is an error message')} variant="destructive">
          Error Toast
        </Button>
        <Button onClick={() => warning('Warning!', 'This is a warning message')} variant="outline">
          Warning Toast
        </Button>
        <Button onClick={() => info('Info!', 'This is an info message')} variant="secondary">
          Info Toast
        </Button>
      </div>
    </div>
  );
}
