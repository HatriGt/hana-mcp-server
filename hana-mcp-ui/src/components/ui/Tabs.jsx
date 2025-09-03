import { useState } from 'react';
import { cn } from '../../utils/cn';

const Tabs = ({ 
  tabs, 
  activeTab, 
  onChange,
  className
}) => {
  return (
    <div className={cn("border-b border-gray-200", className)}>
      <nav className="flex -mb-px space-x-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all",
              activeTab === tab.id
                ? "border-blue-600 text-blue-700 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50/50"
            )}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.icon && (
              <span className="mr-2">{tab.icon}</span>
            )}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "ml-2 py-0.5 px-2 rounded-full text-xs font-semibold",
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;
