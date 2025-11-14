import type { AriaAttributes, DOMAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Add any custom attributes here
  }
}

// Add Lucide React icon props
declare module 'lucide-react' {
  interface LucideProps {
    className?: string;
    size?: number | string;
    color?: string;
    strokeWidth?: number;
  }
}
