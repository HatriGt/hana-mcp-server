import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const VerticalSidebar = ({ 
  activeView, 
  onViewChange, 
  databaseCount, 
  activeConnections,
  claudeConfigured 
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0a2 2 0 002-2h10a2 2 0 012 2v0a2 2 0 012 2z" />
        </svg>
      ),
      description: 'Overview & insights'
    },
    {
      id: 'databases',
      label: 'My Local Databases',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      description: 'Manage configurations',
      count: databaseCount,
      hasSubmenu: true
    },
    {
      id: 'claude',
      label: 'Claude Desktop',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      description: 'Integration status',
      count: activeConnections,
      status: claudeConfigured ? 'online' : 'offline'
    }
  ];

  return (
    <motion.div
      className={cn(
        'bg-white border border-gray-200 flex flex-col h-full rounded-xl shadow-lg overflow-hidden',
        collapsed ? 'w-12 sm:w-16' : 'w-56 sm:w-64'
      )}
      initial={false}
      animate={{ 
        width: collapsed ? 64 : 256,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8
        }
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8
      }}
    >
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-3"
            initial={false}
            animate={{ 
              opacity: collapsed ? 0 : 1,
              x: collapsed ? -20 : 0,
              transition: {
                duration: 0.2,
                delay: collapsed ? 0 : 0.1
              }
            }}
            style={{ display: collapsed ? 'none' : 'flex' }}
          >
            <img 
              src="/logo.png" 
              alt="HANA MCP Logo" 
              className="w-8 h-8 flex-shrink-0"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">HANA MCP</h2>
              <p className="text-xs text-gray-500">Database Manager</p>
            </div>
          </motion.div>
          <motion.div 
            className="flex justify-center w-full"
            initial={false}
            animate={{ 
              opacity: collapsed ? 1 : 0,
              scale: collapsed ? 1 : 0.8,
              transition: {
                duration: 0.2,
                delay: collapsed ? 0.1 : 0
              }
            }}
            style={{ display: collapsed ? 'flex' : 'none' }}
          >
            <img 
              src="/logo.png" 
              alt="HANA MCP Logo" 
              className="w-6 h-6"
            />
          </motion.div>
          <motion.button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.svg 
              className="w-4 h-4 text-gray-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </motion.svg>
          </motion.button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-1 sm:p-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'w-full flex items-center p-3 rounded-lg text-left transition-all duration-200',
                  'hover:bg-gray-50 group',
                  activeView === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:text-gray-900'
                )}
              >
                <div className={cn(
                  'flex-shrink-0',
                  activeView === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                )}>
                  {item.icon}
                </div>
                
                <motion.div 
                  className="ml-3 flex-1 min-w-0"
                  initial={false}
                  animate={{ 
                    opacity: collapsed ? 0 : 1,
                    x: collapsed ? -10 : 0,
                    transition: {
                      duration: 0.2,
                      delay: collapsed ? 0 : 0.1
                    }
                  }}
                  style={{ display: collapsed ? 'none' : 'block' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {item.label}
                    </span>
                    {item.count !== undefined && item.count > 0 && (
                      <motion.span 
                        className={cn(
                          'ml-2 px-2 py-0.5 text-xs font-medium rounded-full',
                          activeView === item.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        )}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {item.count}
                      </motion.span>
                    )}
                    {item.status && (
                      <motion.div 
                        className={cn(
                          'ml-2 w-2 h-2 rounded-full',
                          item.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                        )}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {item.description}
                  </p>
                </motion.div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Quick Actions */}
      <motion.div 
        className="p-3 sm:p-4 border-t border-gray-200 rounded-b-xl"
        initial={false}
        animate={{ 
          opacity: collapsed ? 0 : 1,
          y: collapsed ? 20 : 0,
          transition: {
            duration: 0.2,
            delay: collapsed ? 0 : 0.15
          }
        }}
        style={{ display: collapsed ? 'none' : 'block' }}
      >
        <motion.button
          onClick={() => onViewChange('add-database')}
          className="w-full flex items-center justify-center px-4 py-2 bg-[#86a0ff] text-white text-sm font-medium rounded-lg hover:bg-[#7990e6] transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
           Add Database
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default VerticalSidebar;
