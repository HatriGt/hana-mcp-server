import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import PathConfigModal from './PathConfigModal';

const ClaudeConfigTile = ({ 
  claudeConfigPath, 
  claudeServers, 
  onSetupPath,
  onConfigPathChange
}) => {
  const [showPathModal, setShowPathModal] = useState(false);

  const handleEditPath = () => {
    setShowPathModal(true);
  };

  return (
    <>
      <motion.div
        className="bg-white rounded-xl border border-gray-100 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Claude Desktop Configuration</h3>
              <p className="text-xs text-gray-500">Integration Status</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                claudeServers.length > 0 ? 'bg-green-500' : 'bg-gray-300'
              )}></div>
              <span className="text-xs text-gray-600">
                {claudeServers.length > 0 ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          
          {claudeConfigPath ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-600">
                  Config Path
                </div>
                <button
                  onClick={handleEditPath}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#86a0ff] hover:bg-[#7990e6] rounded-lg transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#86a0ff] focus:ring-offset-2"
                  title="Change config path"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>
              <div className="text-xs font-mono text-gray-700 break-all">
                {claudeConfigPath}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                Claude Desktop configuration path not set
              </p>
              <button
                onClick={onSetupPath}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Set Configuration Path
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Path Configuration Modal */}
      <PathConfigModal
        isOpen={showPathModal}
        onClose={() => setShowPathModal(false)}
        onConfigPathChange={onConfigPathChange}
        currentPath={claudeConfigPath}
      />
    </>
  );
};

export default ClaudeConfigTile;
