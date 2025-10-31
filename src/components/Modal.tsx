import React from 'react';
import { Dialog } from '@headlessui/react';
import useAccessibleModal from '../hooks/useAccessibleModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  const { modalRef } = useAccessibleModal(isOpen, onClose);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      initialFocus={modalRef}
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 2147483647 }}
    >
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

      <div className="relative h-full flex items-stretch justify-end" style={{ zIndex: 2147483647 }}>
        <Dialog.Panel
          ref={modalRef}
          aria-modal="true"
          className={`transform transition-transform duration-300 ease-in-out w-full max-w-md h-full bg-white shadow-xl overflow-y-auto
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* header: reduce horizontal padding to 1rem so title aligns with form fields */}
          <div className="flex items-center justify-between px-4 py-3">
            <Dialog.Title as="div" className="flex items-center gap-2 text-lg font-medium leading-6 text-gray-900">
              {title}
            </Dialog.Title>
            <button
              type="button"
              className="ml-3 inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* content area — reduce horizontal padding to 1rem to match header */}
          <div className="px-4 pb-6">
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default Modal;