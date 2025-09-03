import { useState } from 'react';
import { motion } from 'framer-motion';
import { GradientButton, EnvironmentBadge } from './ui';
import { cn } from '../utils/cn';

const EnhancedServerCard = ({
  name,
  server,
  index,
  activeEnvironment,
  viewMode = 'grid',
  onEdit,
  onAddToClaude,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const environmentCount = Object.keys(server.environments || {}).length;
  const hasActiveConnection = !!activeEnvironment;
  
  // Real connection status
  const connectionStatus = hasActiveConnection ? 'active' : 'configured';
  const lastModified = server.modified ? new Date(server.modified).toLocaleDateString() : 'Unknown';

  // Count environments connected to Claude
  const claudeActiveCount = hasActiveConnection ? 1 : 0;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCardClick = (e) => {
    if (!e.target.closest('button')) {
      toggleExpand();
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'active': return 'text-green-600';
      case 'configured': return 'text-[#86a0ff]';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        className="bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        onClick={handleCardClick}
        tabIndex={0}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">

            
            <div className="flex items-center space-x-4">
                <svg className="h-6 w-6 text-[#86a0ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <span>{environmentCount} environment{environmentCount !== 1 ? 's' : ''}</span>
                  {hasActiveConnection && (
                    <span className="flex items-center space-x-1 text-green-600 font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {/* <span>{claudeActiveCount} active in Claude</span> */}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className="text-center min-w-0">
              <div className={cn('text-sm font-medium', 
                connectionStatus === 'active' ? 'text-green-600' :
                connectionStatus === 'configured' ? 'text-blue-600' :
                'text-gray-600'
              )}>
                {connectionStatus}
              </div>
            </div>

            <div className="text-center min-w-0">
              <div className="text-sm text-gray-600">
                {lastModified}
              </div>
            </div>

            {activeEnvironment && (
              <div className="flex flex-col items-center">
                <EnvironmentBadge environment={activeEnvironment} active size="sm" />
                <div className="text-xs text-green-600 font-medium mt-1">active</div>
              </div>
            )}

            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit database"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToClaude();
                }}
                className="p-2 text-[#86a0ff] hover:text-[#7990e6] transition-colors"
                title="Add to Claude"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors rounded-lg"
                title="Delete database"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
              className="bg-white border rounded-xl overflow-hidden transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      onClick={handleCardClick}
      tabIndex={0}
      layout
    >


      {/* Header - Always Visible */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <svg className="h-8 w-8 text-[#86a0ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">{name}</h3>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <span>{environmentCount} environment{environmentCount !== 1 ? 's' : ''}</span>
                {hasActiveConnection && (
                  <span className="flex items-center space-x-1 text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {/* <span className="text-xs">{claudeActiveCount} active in Claude</span> */}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
          >
            <svg 
              className={cn('h-5 w-5 transition-transform duration-300', isExpanded && 'rotate-180')} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {server.description && (
          <p className="text-sm text-gray-600 mb-3">{server.description}</p>
        )}

        {/* Environment Status Summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(server.environments || {}).map(env => (
              <EnvironmentBadge
                key={env}
                environment={env}
                active={activeEnvironment === env}
                size="sm"
              />
            ))}
          </div>
          
          {hasActiveConnection && (
            <div className="flex items-center space-x-1 text-green-600 text-xs font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>active</span>
            </div>
          )}
        </div>

        {!isExpanded && activeEnvironment && (
          <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg border border-green-200">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-700 font-medium">
              {activeEnvironment} environment is active
            </span>
          </div>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-t border-gray-100"
        >
          <div className="p-4">
            {/* Environment Details */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Environment Status</h4>
              <div className="space-y-2">
                {Object.keys(server.environments || {}).map(env => (
                  <div key={env} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <EnvironmentBadge
                      environment={env}
                      active={activeEnvironment === env}
                      size="sm"
                    />
                    <div className="flex items-center space-x-2">
                      {activeEnvironment === env ? (
                        <span className="flex items-center space-x-1 text-green-600 text-xs font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>active</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Not connected</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-100">
              <GradientButton
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex-1"
              >
                Edit
              </GradientButton>

              <GradientButton
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToClaude();
                }}
                className="flex-1"
              >
                Add to Claude
              </GradientButton>
              <GradientButton
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete database"
                className="px-3"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </GradientButton>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EnhancedServerCard;
