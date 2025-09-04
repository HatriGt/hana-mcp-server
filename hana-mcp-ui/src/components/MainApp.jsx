import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Import components
import VerticalSidebar from './layout/VerticalSidebar';
import DashboardView from './DashboardView';
import DatabaseListView from './DatabaseListView';
import ClaudeConfigTile from './ClaudeConfigTile'
import ClaudeDesktopView from './ClaudeDesktopView'
import ConnectionDetailsModal from './ConnectionDetailsModal';

// Import existing components
import ConfigurationModal from './ConfigurationModal';
import EnvironmentSelector from './EnvironmentSelector';
import PathSetupModal from './PathSetupModal';
import { LoadingOverlay, GlassWindow } from './ui';

const API_BASE = 'http://localhost:3001/api';

const MainApp = () => {
  // State management
  const [activeView, setActiveView] = useState('dashboard');
  const [hanaServers, setHanaServers] = useState({});
  const [claudeServers, setClaudeServers] = useState([]);
  const [claudeConfigPath, setClaudeConfigPath] = useState(null);
  const [activeEnvironments, setActiveEnvironments] = useState({});
  
  // UI State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPathSetupOpen, setIsPathSetupOpen] = useState(false)
  const [isConnectionDetailsOpen, setIsConnectionDetailsOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [isEnvironmentSelectorOpen, setIsEnvironmentSelectorOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [deploymentTarget, setDeploymentTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('Production');
  const [isLoading, setIsLoading] = useState(false);

  // Form data for multi-environment configuration
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environments: {
      Production: {
        HANA_HOST: '',
        HANA_PORT: '443',
        HANA_USER: '',
        HANA_PASSWORD: '',
        HANA_SCHEMA: '',
        HANA_SSL: 'true',
        HANA_ENCRYPT: 'true',
        HANA_VALIDATE_CERT: 'true',
        LOG_LEVEL: 'info',
        ENABLE_FILE_LOGGING: 'true',
        ENABLE_CONSOLE_LOGGING: 'false'
      },
      Development: {
        HANA_HOST: '',
        HANA_PORT: '443',
        HANA_USER: '',
        HANA_PASSWORD: '',
        HANA_SCHEMA: '',
        HANA_SSL: 'true',
        HANA_ENCRYPT: 'true',
        HANA_VALIDATE_CERT: 'false',
        LOG_LEVEL: 'debug',
        ENABLE_FILE_LOGGING: 'true',
        ENABLE_CONSOLE_LOGGING: 'true'
      },
      Staging: {
        HANA_HOST: '',
        HANA_PORT: '443',
        HANA_USER: '',
        HANA_PASSWORD: '',
        HANA_SCHEMA: '',
        HANA_SSL: 'true',
        HANA_ENCRYPT: 'true',
        HANA_VALIDATE_CERT: 'true',
        LOG_LEVEL: 'info',
        ENABLE_FILE_LOGGING: 'true',
        ENABLE_CONSOLE_LOGGING: 'false'
      }
    }
  });

  const [pathInput, setPathInput] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh Claude data when Claude tab is opened (only if not initial load)
  useEffect(() => {
    if (activeView === 'claude' && claudeServers.length > 0) {
      // Only refresh if we already have data (prevents race condition on first load)
      // Silent refresh (no toast notification)
      refreshClaudeData(false);
    }
  }, [activeView]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadHanaServers(),
        loadClaudeServers(),
        loadClaudeConfigPath(),
        loadActiveEnvironments()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshClaudeData = async (showToast = true) => {
    try {
      await Promise.all([
        loadClaudeServers(),
        loadActiveEnvironments()
      ]);
      if (showToast) {
        toast.success('Configuration refreshed');
      }
    } catch (error) {
      console.error('Error refreshing Claude data:', error);
      if (showToast) {
        toast.error('Failed to refresh configuration');
      }
    }
  };

  const loadHanaServers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/hana-servers`);
      setHanaServers(response.data);
    } catch (error) {
      console.error('Error loading HANA servers:', error);
    }
  };

  const loadClaudeServers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/claude`);
      setClaudeServers(response.data);
    } catch (error) {
      console.error('Error loading Claude servers:', error);
    }
  };

  const loadClaudeConfigPath = async () => {
    try {
      const response = await axios.get(`${API_BASE}/claude/config-path`);
      setClaudeConfigPath(response.data.configPath);
      
      if (!response.data.configPath) {
        setPathInput(response.data.defaultPath || '');
        setIsPathSetupOpen(true);
      }
    } catch (error) {
      console.error('Error loading Claude config path:', error);
    }
  };

  const loadActiveEnvironments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/claude/active-environments`);
      setActiveEnvironments(response.data);
    } catch (error) {
      console.error('Error loading active environments:', error);
    }
  };

  // Form handlers
  const handleFormChange = (environment, field, value) => {
    setFormData(prev => ({
      ...prev,
      environments: {
        ...prev.environments,
        [environment]: {
          ...(prev.environments[environment] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleServerInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle environment-specific updates
  const handleEnvironmentUpdate = (environments) => {
    setFormData(prev => ({
      ...prev,
      environments: environments
    }));
  };

  // Navigation handlers
  const handleViewChange = (view) => {
    setActiveView(view);
    
    // Handle special actions
    if (view === 'add-database') {
      openConfigModal();
      return;
    }
  };

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'add-database':
        openConfigModal();
        break;
      case 'manage-databases':
        setActiveView('databases');
        break;
      case 'claude-integration':
        setActiveView('claude');
        break;
      default:
    
    }
  };

  const handleBulkAction = (action, selectedItems) => {
    switch (action) {
      case 'deploy':
        toast.success(`Adding ${selectedItems.length} database(s) to Claude`);
        break;
      case 'test':
        toast.success(`Testing connections for ${selectedItems.length} database(s)`);
        break;
      case 'export':
        toast.success(`Exporting ${selectedItems.length} database configuration(s)`);
        break;
      default:
    
    }
  };

  const handleConfigPathChange = async (newPath) => {
    try {
      // Update the config path via API
      await axios.post(`${API_BASE}/claude/config-path`, { 
        configPath: newPath 
      });
      
      // Update local state
      setClaudeConfigPath(newPath);
      toast.success('Configuration path updated successfully');
      
      // Refresh Claude data to reflect changes
      await refreshClaudeData(false);
    } catch (error) {
      console.error('Error updating config path:', error);
      toast.error('Failed to update configuration path');
    }
  };

  // Modal handlers
  const openConfigModal = (server = null) => {
    if (server) {
      setFormData(server);
      setSelectedServer(server);
      // Set active tab to first available environment when editing
      const envKeys = Object.keys(server.environments || {});
      setActiveTab(envKeys.length > 0 ? envKeys[0] : null);
    } else {
      // Reset form for new server
      setFormData({
        name: '',
        description: '',
        environments: {}
      });
      setSelectedServer(null);
      setActiveTab(null);
    }
    setIsConfigModalOpen(true);
  };



  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    setSelectedServer(null);
    setActiveTab(null);
  };

  // Server operations
  const saveServer = async () => {
    try {
      setIsLoading(true);
      
  
      
      if (selectedServer) {
        await axios.put(`${API_BASE}/hana-servers/${selectedServer.name}`, formData);
        toast.success('Database updated successfully');
      } else {
        await axios.post(`${API_BASE}/hana-servers`, formData);
        toast.success('Database created successfully');
      }

      closeConfigModal();
      await loadHanaServers();
    } catch (error) {
      console.error('Error saving server:', error);
      toast.error(error.response?.data?.error || 'Failed to save database');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteServer = async (serverName) => {
    try {
      setIsLoading(true);
      await axios.delete(`${API_BASE}/hana-servers/${serverName}`);
      toast.success('Database deleted successfully');
      await loadHanaServers();
    } catch (error) {
      console.error('Error deleting server:', error);
      toast.error('Failed to delete database');
    } finally {
      setIsLoading(false);
    }
  };

  // Claude operations
  const openEnvironmentSelector = (serverName) => {
    setDeploymentTarget(serverName);
    setIsEnvironmentSelectorOpen(true);
  };

  const deployToClaude = async (environment) => {
    try {
      setIsLoading(true);
      await axios.post(`${API_BASE}/apply-to-claude`, {
        serverName: deploymentTarget,
        environment: environment
      });
      toast.success(`Added ${deploymentTarget} (${environment}) to Claude Desktop configuration`);
      setIsEnvironmentSelectorOpen(false);
      setDeploymentTarget(null);
      await loadClaudeServers();
      await loadActiveEnvironments();
    } catch (error) {
      console.error('Error adding to Claude:', error);
      toast.error(error.response?.data?.error || 'Failed to add to Claude configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromClaude = async (serverName) => {
    try {
      setIsLoading(true);
      await axios.delete(`${API_BASE}/claude/${serverName}`);
      toast.success(`Removed ${serverName} from Claude Desktop`);
      await loadClaudeServers();
      await loadActiveEnvironments();
    } catch (error) {
      console.error('Error removing from Claude:', error);
      toast.error('Failed to remove from Claude');
    } finally {
      setIsLoading(false);
    }
  };

  // Claude path operations
  const saveClaudePath = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${API_BASE}/claude/config-path`, {
        configPath: pathInput
      });
      setClaudeConfigPath(pathInput);
      setIsPathSetupOpen(false);
      toast.success('Claude config path saved successfully');
      await loadClaudeServers();
    } catch (error) {
      console.error('Error saving Claude path:', error);
      toast.error('Failed to save Claude config path');
    } finally {
      setIsLoading(false);
    }
  };

  // Render main content based on active view
  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            hanaServers={hanaServers}
            claudeServers={claudeServers}
            activeEnvironments={activeEnvironments}
            onQuickAction={handleQuickAction}
          />
        );
      case 'databases':
        return (
          <DatabaseListView
            hanaServers={hanaServers}
            claudeServers={claudeServers}
            activeEnvironments={activeEnvironments}
            onEditServer={openConfigModal}
            onAddToClaudeServer={openEnvironmentSelector}
            onDeleteServer={deleteServer}
            onBulkAction={handleBulkAction}
            onAddDatabase={() => openConfigModal()}
          />
        );
      case 'claude':
        return (
          <ClaudeDesktopView
            claudeConfigPath={claudeConfigPath}
            claudeServers={claudeServers}
            activeEnvironments={activeEnvironments}
            onSetupPath={() => setIsPathSetupOpen(true)}
            onRemoveConnection={(connection) => {
              // Handle removing connection from Claude Desktop
          
              toast.success(`Removed ${connection.name} from Claude Desktop`);
            }}
            onViewConnection={(connection) => {
              setSelectedConnection(connection);
              setIsConnectionDetailsOpen(true);
            }}
            onRefresh={refreshClaudeData}
            onConfigPathChange={handleConfigPathChange}
          />
        );
      

      default:
        return (
          <DashboardView
            hanaServers={hanaServers}
            claudeServers={claudeServers}
            activeEnvironments={activeEnvironments}
            onQuickAction={handleQuickAction}
          />
        );
    }
  };

  return (
    <GlassWindow maxWidth="full" maxHeight="full">
      <div className="flex h-full bg-transparent p-3 sm:p-4 overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <LoadingOverlay message="Processing your request..." />
        )}

        {/* Floating Sidebar */}
        <div className="flex-shrink-0 h-full">
          <VerticalSidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            databaseCount={Object.keys(hanaServers).length}
            activeConnections={claudeServers.length}
            claudeConfigured={!!claudeConfigPath}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white/50 backdrop-blur-sm rounded-r-2xl sm:rounded-r-3xl ml-3">
          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden p-4 sm:p-6 pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderMainContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Modals */}
      {isConfigModalOpen && (
        <ConfigurationModal
          isOpen={isConfigModalOpen}
          onClose={closeConfigModal}
          server={selectedServer}
          formData={formData}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onFormChange={handleFormChange}
          onServerInfoChange={handleServerInfoChange}
          onSave={saveServer}
          isLoading={isLoading}
        />
      )}

      {isEnvironmentSelectorOpen && deploymentTarget && (
        <EnvironmentSelector
          isOpen={isEnvironmentSelectorOpen}
          onClose={() => {
            setIsEnvironmentSelectorOpen(false);
            setDeploymentTarget(null);
          }}
          serverName={deploymentTarget}
          environments={hanaServers[deploymentTarget]?.environments || {}}
          activeEnvironment={activeEnvironments[deploymentTarget]}
          onDeploy={deployToClaude}
          isLoading={isLoading}
        />
      )}

      {isPathSetupOpen && (
        <PathSetupModal
          isOpen={isPathSetupOpen}
          onClose={() => setIsPathSetupOpen(false)}
          pathInput={pathInput}
          setPathInput={setPathInput}
          onSave={saveClaudePath}
          isLoading={isLoading}
        />
      )}

      <ConnectionDetailsModal
        isOpen={isConnectionDetailsOpen}
        onClose={() => {
          setIsConnectionDetailsOpen(false);
          setSelectedConnection(null);
        }}
        connection={selectedConnection}
      />
    </GlassWindow>
  );
};

export default MainApp;
