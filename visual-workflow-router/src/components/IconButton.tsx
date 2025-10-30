import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, label, onClick, disabled = false, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default IconButton;