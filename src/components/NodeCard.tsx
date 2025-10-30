import React from 'react';
import styles from './NodeCard.module.css';

interface NodeCardProps {
  title: string;
  type: string;
  details: Record<string, any>;
}

const NodeCard: React.FC<NodeCardProps> = ({ title, type, details }) => {
  return (
    <div className={styles.nodeCard}>
      <h3 className={styles.nodeTitle}>{title}</h3>
      <p className={styles.nodeType}>Type: {type}</p>
      <div className={styles.nodeDetails}>
        <h4>Details:</h4>
        <pre>{JSON.stringify(details, null, 2)}</pre>
      </div>
    </div>
  );
};

export default NodeCard;