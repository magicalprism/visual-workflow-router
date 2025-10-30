import React from 'react';
import TabsDefault from './Tabs';

export const Tabs = TabsDefault;

interface TabPanelProps {
  value: string;
  activeTab?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * TabPanel: renders children only when value === activeTab.
 * Do not forward custom props to DOM.
 */
export const TabPanel: React.FC<TabPanelProps> = ({ value, activeTab, children, className }) => {
  if (activeTab !== value) return null;
  return <div className={className}>{children}</div>;
};

export default Tabs;