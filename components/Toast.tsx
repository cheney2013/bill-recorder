import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number; // ms
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 2500 }) => {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-20 z-50 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg text-sm md:text-base"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
};
