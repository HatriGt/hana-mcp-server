import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from './ui';
import { cn } from '../utils/cn';
import EnvironmentManager from './EnvironmentManager';

const DashboardView = ({ 
  hanaServers, 
  claudeServers, 
  activeEnvironments,
  onQuickAction 
}) => {
  const [showEnvironmentManager, setShowEnvironmentManager] = useState(false);
  // Calculate insights
  const totalDatabases = Object.keys(hanaServers).length;
  const activeConnections = claudeServers.length;
  const totalEnvironments = Object.values(hanaServers).reduce((total, server) => {
    return total + Object.keys(server.environments || {}).length;
  }, 0);

  const environmentBreakdown = Object.values(hanaServers).reduce((breakdown, server) => {
    Object.keys(server.environments || {}).forEach(env => {
      breakdown[env] = (breakdown[env] || 0) + 1;
    });
    return breakdown;
  }, {});

  // Calculate real connection status
  const connectionStatus = activeConnections > 0 ? 'Connected' : 'Not Connected';
  const configuredDatabases = Object.keys(hanaServers).filter(key => 
    Object.keys(hanaServers[key].environments || {}).length > 0
  ).length;

  const quickActions = [
    {
      id: 'add-database',
      title: 'Add New Database',
      description: 'Configure a new HANA database connection',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      color: 'blue',
      enabled: true
    },
    {
      id: 'manage-databases',
      title: 'Manage Databases',
      description: 'View and configure your database connections',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      color: 'green',
      enabled: totalDatabases > 0
    },
    {
      id: 'claude-integration',
      title: 'Claude Integration',
      description: 'Manage Claude Desktop integration',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      color: 'purple',
      enabled: true
    }
  ].filter(action => action.enabled);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-100 rounded-2xl sm:rounded-3xl">
      {/* Welcome Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Dashboard</h1>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Databases"
          value={totalDatabases}
        />
        <MetricCard
          title="Active Connections"
          value={activeConnections}
        />
        <MetricCard
          title="Total Environments"
          value={totalEnvironments}
        />
        <MetricCard
          title="Configured Databases"
          value={configuredDatabases}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onQuickAction(action.id)}
              className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-[#86a0ff] hover:shadow-sm transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-colors text-gray-900 group-hover:text-[#86a0ff]">
                {action.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">{action.title}</h3>
              <p className="text-xs text-gray-900 text-center">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">System Status</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
              <div className="flex items-center">
                <div className={cn(
                  'w-3 h-3 rounded-full mr-3',
                  totalDatabases > 0 ? 'bg-green-500' : 'bg-gray-400'
                )} />
                <span className="text-sm font-medium text-gray-900">Database Connections</span>
              </div>
              <span className="text-sm text-gray-600">
                {totalDatabases > 0 ? `${totalDatabases} configured` : 'No databases'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
              <div className="flex items-center">
                <div className={cn(
                  'w-3 h-3 rounded-full mr-3',
                  activeConnections > 0 ? 'bg-green-500' : 'bg-gray-400'
                )} />
                <span className="text-sm font-medium text-gray-900">Claude Integration</span>
              </div>
              <span className="text-sm text-gray-600">
                {activeConnections > 0 ? `${activeConnections} active` : 'Not connected'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
              <div className="flex items-center">
                <div className={cn(
                  'w-3 h-3 rounded-full mr-3',
                  totalEnvironments > 0 ? 'bg-green-500' : 'bg-gray-400'
                )} />
                <span className="text-sm font-medium text-gray-900">Environment Setup</span>
              </div>
              <span className="text-sm text-gray-600">
                {totalEnvironments > 0 ? `${totalEnvironments} environments` : 'No environments'}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Environment Distribution</h2>
            <button
              onClick={() => setShowEnvironmentManager(true)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Manage Environments
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(environmentBreakdown).map(([env, count]) => (
              <div key={env} className="text-center p-3 bg-gray-100 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600">{env}</div>
              </div>
            ))}
            {Object.keys(environmentBreakdown).length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-6">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm">No environments configured yet</p>
                <button
                  onClick={() => setShowEnvironmentManager(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
                >
                  Click to add environments
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Claude Integration Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Claude Desktop Integration</h2>
          <div className="flex items-center">
            <div className={cn(
              'w-2 h-2 rounded-full mr-2',
              activeConnections > 0 ? 'bg-green-500' : 'bg-gray-300'
            )} />
            <span className="text-sm text-gray-600">
              {activeConnections > 0 ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-base font-semibold text-green-900">{activeConnections}</div>
            <div className="text-xs text-green-700">Active Connections</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-base font-semibold text-blue-900">{Math.max(0, totalDatabases - activeConnections)}</div>
            <div className="text-xs text-blue-700">Available to Add</div>
          </div>
        </div>
      </div>

      {/* Environment Manager Modal */}
      <EnvironmentManager
        isOpen={showEnvironmentManager}
        onClose={() => setShowEnvironmentManager(false)}
        onSave={(environments) => {
          // This would update the environments in the app state
      
          // In a real app, you'd update the global state here
        }}
      />
    </div>
  );
};

export default DashboardView;
