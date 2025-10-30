import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  children?: React.ReactNode;
  className?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, children, className, activeTab: controlledActiveTab, onTabChange }) => {
  const [internalActive, setInternalActive] = useState(tabs?.[0]?.id ?? '');
  const activeTab = controlledActiveTab ?? internalActive;

  const handleTabClick = (tabId: string) => {
    if (onTabChange) onTabChange(tabId);
    if (controlledActiveTab === undefined) setInternalActive(tabId);
  };

  return (
    <div className={`tabs ${className ?? ''}`}>
      {/* add small gap above tabs so they sit clearly under the title */}
      <div className="tab-list flex items-center mt-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`tab-button py-2 px-3 text-sm rounded-full ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100'}`}
            aria-selected={activeTab === tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* tab-content uses parent's padding (Modal px-8) so no extra horizontal inset here */}
      <div className="tab-content" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && (child.props as any).tabId === activeTab) {
            return React.cloneElement(child, { isActive: true });
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default Tabs;