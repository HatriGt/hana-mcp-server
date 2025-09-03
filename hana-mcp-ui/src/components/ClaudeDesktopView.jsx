import { useState } from 'react';
import { motion } from 'framer-motion';
import ClaudeConfigTile from './ClaudeConfigTile';
import BackupHistoryModal from './BackupHistoryModal';
import { EnvironmentBadge } from './ui/StatusBadge';
import { cn } from '../utils/cn';
import { ArchiveBoxIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ClaudeDesktopView = ({ 
  claudeConfigPath, 
  claudeServers, 
  activeEnvironments,
  onSetupPath,
  onRemoveConnection,
  onViewConnection,
  onRefresh,
  onConfigPathChange
}) => {
  const activeConnections = claudeServers.length;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBackupHistory, setShowBackupHistory] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-100 rounded-2xl sm:rounded-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Claude Desktop Integration</h1>
          <p className="text-gray-600">
            Manage your HANA database connections available in Claude Desktop
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBackupHistory(true)}
            className="flex items-center px-3 py-2 text-sm font-medium bg-gray-100 border border-gray-200 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:bg-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
            title="Manage configuration backups"
          >
            <ArchiveBoxIcon className="w-4 h-4 mr-2" />
            Backups
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm hover:shadow-md",
              isRefreshing 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-gray-700 hover:bg-gray-200 hover:border-gray-300"
            )}
            title="Refresh configuration from Claude Desktop"
          >
            <ArrowPathIcon className={cn(
              "w-4 h-4 mr-2",
              isRefreshing && "animate-spin"
            )} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Configuration Status */}
      <ClaudeConfigTile 
        claudeConfigPath={claudeConfigPath}
        claudeServers={claudeServers}
        onSetupPath={onSetupPath}
        onConfigPathChange={onConfigPathChange}
      />

      {/* Active Database Connections */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Active Database Connections</h2>
          <div className="flex items-center">
            <div className={cn(
              'w-2 h-2 rounded-full mr-2',
              activeConnections > 0 ? 'bg-green-500' : 'bg-gray-300'
            )} />
            <span className="text-sm text-gray-600">
              {activeConnections} {activeConnections === 1 ? 'connection' : 'connections'} active
            </span>
          </div>
        </div>

        {activeConnections > 0 ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto claude-table-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Database
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claudeServers.map((server) => (
                  <tr 
                    key={server.name} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onViewConnection(server)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{server.name}</div>
                          <div className="text-sm text-gray-500">{server.env.HANA_HOST}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></span>
                        {server.env?.ENVIRONMENT || 'Development'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewConnection(server);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveConnection(server);
                        }}
                        className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active connections</h3>
            <p className="text-gray-600 mb-4">
              You haven't added any HANA databases to Claude Desktop yet
            </p>
            <button
              onClick={onSetupPath}
              className="inline-flex items-center px-4 py-2 bg-[#86a0ff] text-white text-sm font-medium rounded-lg hover:bg-[#7990e6] transition-colors shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Setup Claude Desktop
            </button>
          </div>
        )}
      </div>

      {/* Backup History Modal */}
      <BackupHistoryModal
        isOpen={showBackupHistory}
        onClose={() => setShowBackupHistory(false)}
      />
    </div>
  );
};

export default ClaudeDesktopView;
