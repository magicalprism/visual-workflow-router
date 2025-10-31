import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  widthClass?: string; // e.g. "max-w-md"
}

export default function Drawer({ isOpen, onClose, title, children, widthClass = 'max-w-md' }: DrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[2147483647] flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className={`relative ml-auto h-full w-full ${widthClass} bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-lg font-medium">{title}</div>
          <button onClick={onClose} aria-label="Close drawer" className="p-2 rounded hover:bg-gray-100">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-auto h-full">{children}</div>
      </aside>
    </div>,
    document.body
  );
}