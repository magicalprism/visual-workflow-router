import React from 'react';
import styles from './GraphStyles.module.css';

const GraphToolbar: React.FC = () => {
  const handleZoomIn = () => {
    // Implement zoom in functionality
  };

  const handleZoomOut = () => {
    // Implement zoom out functionality
  };

  const handleResetView = () => {
    // Implement reset view functionality
  };

  return (
    <div className={styles.toolbar}>
      <button onClick={handleZoomIn}>Zoom In</button>
      <button onClick={handleZoomOut}>Zoom Out</button>
      <button onClick={handleResetView}>Reset View</button>
    </div>
  );
};

export default GraphToolbar;