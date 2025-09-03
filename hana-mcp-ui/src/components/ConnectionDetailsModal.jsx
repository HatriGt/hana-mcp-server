import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { EnvironmentBadge } from './ui/StatusBadge';

const ConnectionDetailsModal = ({ isOpen, onClose, connection }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !connection) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{connection.name}</h2>
              <p className="text-sm text-gray-500">Database Connection Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-green-800">Connected to Claude Desktop</p>
                <p className="text-xs text-green-600">Active and available for use</p>
              </div>
            </div>
            <EnvironmentBadge 
              environment={connection.env?.ENVIRONMENT || connection.environment || 'Development'} 
              active={true}
              size="sm" 
            />
          </div>
        </div>

        {/* Connection Configuration */}
        <div className="space-y-4">
          {/* Basic Connection Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Connection Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                <p className="text-sm text-gray-900 font-mono break-all">
                  {connection.env?.HANA_HOST || 'Not configured'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <p className="text-sm text-gray-900 font-mono">
                  {connection.env?.HANA_PORT || '443'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <p className="text-sm text-gray-900 font-mono break-all">
                  {connection.env?.HANA_USER || 'Not set'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Schema</label>
                <p className="text-sm text-gray-900 font-mono break-all">
                  {connection.env?.HANA_SCHEMA || 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Security & SSL Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Security & SSL Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">SSL Enabled</label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connection.env?.HANA_SSL === 'true' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <p className="text-sm text-gray-900">
                    {connection.env?.HANA_SSL === 'true' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connection.env?.HANA_ENCRYPT === 'true' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <p className="text-sm text-gray-900">
                    {connection.env?.HANA_ENCRYPT === 'true' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Validation</label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connection.env?.HANA_VALIDATE_CERT === 'true' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <p className="text-sm text-gray-900">
                    {connection.env?.HANA_VALIDATE_CERT === 'true' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logging Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Logging Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Log Level</label>
                <p className="text-sm text-gray-900 font-semibold uppercase">
                  {connection.env?.LOG_LEVEL || 'info'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">File Logging</label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connection.env?.ENABLE_FILE_LOGGING === 'true' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <p className="text-sm text-gray-900">
                    {connection.env?.ENABLE_FILE_LOGGING === 'true' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">Console Logging</label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connection.env?.ENABLE_CONSOLE_LOGGING === 'true' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <p className="text-sm text-gray-900">
                    {connection.env?.ENABLE_CONSOLE_LOGGING === 'true' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConnectionDetailsModal;
