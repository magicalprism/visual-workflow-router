import React from 'react';

type Props = {
  className?: string;
  children: React.ReactNode;
};

const FlowToolbar: React.FC<Props> = ({ className = '', children }) => {
  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`relative z-50 pointer-events-auto ${className}`}
      onMouseDown={stop}
      onMouseUp={stop}
      onClick={stop}
      onTouchStart={stop}
      onTouchEnd={stop}
      role="toolbar"
    >
      {children}
    </div>
  );
};

export default FlowToolbar;