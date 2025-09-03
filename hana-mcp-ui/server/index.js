import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Storage paths - ensure they work regardless of where the server is started from
const UI_ROOT = dirname(__dirname); // This is the hana-mcp-ui directory
const DATA_DIR = join(UI_ROOT, 'data');
const SERVERS_FILE = join(DATA_DIR, 'hana-servers.json');
const CONFIG_FILE = join(DATA_DIR, 'config.json');
const BACKUPS_DIR = join(DATA_DIR, 'backups');
const BACKUP_HISTORY_FILE = join(DATA_DIR, 'backup-history.json');

// Ensure data directory exists
await fs.ensureDir(DATA_DIR);
await fs.ensureDir(BACKUPS_DIR);

// Default Claude config paths by OS
const getDefaultClaudeConfigPath = () => {
  const platform = process.platform;
  switch (platform) {
    case 'darwin':
      return join(homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');
    case 'win32':
      return join(homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json');
    default:
      return join(homedir(), '.config/claude/claude_desktop_config.json');
  }
};

// Helper functions
const loadServers = async () => {
  try {
    if (await fs.pathExists(SERVERS_FILE)) {
      return await fs.readJson(SERVERS_FILE);
    }
    return {};
  } catch (error) {
    console.error('Error loading servers:', error);
    return {};
  }
};

const saveServers = async (servers) => {
  try {
    await fs.writeJson(SERVERS_FILE, servers, { spaces: 2 });
  } catch (error) {
    console.error('Error saving servers:', error);
    throw error;
  }
};

const loadConfig = async () => {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      return await fs.readJson(CONFIG_FILE);
    }
    return {};
  } catch (error) {
    console.error('Error loading config:', error);
    return {};
  }
};

const saveConfig = async (config) => {
  try {
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
};

const loadClaudeConfig = async (configPath) => {
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
    return { mcpServers: {} };
  } catch (error) {
    console.error('Error loading Claude config:', error);
    return { mcpServers: {} };
  }
};

const saveClaudeConfig = async (configPath, config, skipBackup = false) => {
  try {
    // Create backup before saving (unless explicitly skipped)
    if (!skipBackup && await fs.pathExists(configPath)) {
      await createBackup(configPath, 'Auto backup before save');
    }
    
    await fs.ensureDir(dirname(configPath));
    await fs.writeJson(configPath, config, { spaces: 2 });
  } catch (error) {
    console.error('Error saving Claude config:', error);
    throw error;
  }
};

// Helper function to identify HANA MCP servers
const isHanaMcpServer = (server) => {
  // Must have the correct command
  if (server.command !== 'hana-mcp-server') {
    return false;
  }
  
  // Must have HANA-specific environment variables for a complete HANA server
  if (!server.env) {
    return false;
  }
  
  const hasHanaHost = server.env.HANA_HOST;
  const hasHanaUser = server.env.HANA_USER;
  const hasHanaSchema = server.env.HANA_SCHEMA;
  
  // Must have all core HANA environment variables
  return hasHanaHost && hasHanaUser && hasHanaSchema;
};

// Helper function to filter only HANA MCP servers from Claude config
const filterHanaMcpServers = (mcpServers) => {
  const hanaServers = {};
  
  for (const [name, server] of Object.entries(mcpServers || {})) {
    if (isHanaMcpServer(server)) {
      hanaServers[name] = server;
    }
  }
  
  return hanaServers;
};

// Helper function to merge HANA servers while preserving non-HANA servers
const mergeWithPreservation = (originalConfig, hanaServers) => {
  const newConfig = { ...originalConfig };
  
  // Start with original mcpServers
  newConfig.mcpServers = { ...originalConfig.mcpServers };
  
  // Remove existing HANA servers
  for (const [name, server] of Object.entries(newConfig.mcpServers || {})) {
    if (isHanaMcpServer(server)) {
      delete newConfig.mcpServers[name];
    }
  }
  
  // Add new HANA servers
  newConfig.mcpServers = {
    ...newConfig.mcpServers,
    ...hanaServers
  };
  
  return newConfig;
};

// Backup management functions
const loadBackupHistory = async () => {
  try {
    if (await fs.pathExists(BACKUP_HISTORY_FILE)) {
      return await fs.readJson(BACKUP_HISTORY_FILE);
    }
    return [];
  } catch (error) {
    console.error('Error loading backup history:', error);
    return [];
  }
};

const saveBackupHistory = async (history) => {
  try {
    await fs.writeJson(BACKUP_HISTORY_FILE, history, { spaces: 2 });
  } catch (error) {
    console.error('Error saving backup history:', error);
    throw error;
  }
};

const createBackup = async (configPath, reason = 'Manual backup') => {
  try {
    if (!await fs.pathExists(configPath)) {
      throw new Error('Config file does not exist');
    }

    const timestamp = new Date().toISOString();
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const backupFileName = `${backupId}.json`;
    const backupFilePath = join(BACKUPS_DIR, backupFileName);

    // Read and backup the config
    const config = await fs.readJson(configPath);
    await fs.writeJson(backupFilePath, config, { spaces: 2 });

    // Create backup metadata
    const backupEntry = {
      id: backupId,
      timestamp,
      fileName: backupFileName,
      reason,
      size: JSON.stringify(config).length,
      mcpServerCount: Object.keys(config.mcpServers || {}).length,
      hanaServerCount: Object.keys(filterHanaMcpServers(config.mcpServers || {})).length
    };

    // Update history
    const history = await loadBackupHistory();
    history.unshift(backupEntry); // Add to beginning (most recent first)

    // Keep only last 50 backups
    if (history.length > 50) {
      const oldBackups = history.splice(50);
      // Delete old backup files
      for (const oldBackup of oldBackups) {
        const oldBackupPath = join(BACKUPS_DIR, oldBackup.fileName);
        if (await fs.pathExists(oldBackupPath)) {
          await fs.remove(oldBackupPath);
        }
      }
    }

    await saveBackupHistory(history);
    return backupEntry;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

const restoreBackup = async (backupId, configPath) => {
  try {
    const history = await loadBackupHistory();
    const backup = history.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error('Backup not found');
    }

    const backupFilePath = join(BACKUPS_DIR, backup.fileName);
    if (!await fs.pathExists(backupFilePath)) {
      throw new Error('Backup file not found');
    }

    // Create a backup of current state before restoring
    await createBackup(configPath, `Before restoring to ${backup.timestamp}`);

    // Restore the backup
    const backupConfig = await fs.readJson(backupFilePath);
    await saveClaudeConfig(configPath, backupConfig, true); // Skip backup when restoring

    return backup;
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
};

// API Routes

// Get Claude Desktop config path
app.get('/api/claude/config-path', async (req, res) => {
  try {
    const config = await loadConfig();
    res.json({ 
      configPath: config.claudeConfigPath || null,
      defaultPath: getDefaultClaudeConfigPath()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set Claude Desktop config path
app.post('/api/claude/config-path', async (req, res) => {
  try {
    const { configPath } = req.body;
    
    if (!configPath) {
      return res.status(400).json({ error: 'Config path is required' });
    }

    // Validate path exists or can be created
    const dir = dirname(configPath);
    await fs.ensureDir(dir);

    const config = await loadConfig();
    config.claudeConfigPath = configPath;
    await saveConfig(config);

    res.json({ success: true, configPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all local HANA servers
app.get('/api/hana-servers', async (req, res) => {
  try {
    const servers = await loadServers();
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new HANA server
app.post('/api/hana-servers', async (req, res) => {
  try {
    const serverConfig = req.body;
    
    if (!serverConfig.name) {
      return res.status(400).json({ error: 'Server name is required' });
    }

    const servers = await loadServers();
    
    if (servers[serverConfig.name]) {
      return res.status(409).json({ error: 'Server with this name already exists' });
    }

    // Add metadata
    serverConfig.created = new Date().toISOString();
    serverConfig.modified = new Date().toISOString();
    serverConfig.version = '1.0.0';

    servers[serverConfig.name] = serverConfig;
    await saveServers(servers);

    res.status(201).json(serverConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update HANA server
app.put('/api/hana-servers/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const updatedConfig = req.body;

    const servers = await loadServers();
    
    if (!servers[name]) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Preserve creation date, update modified date
    updatedConfig.created = servers[name].created;
    updatedConfig.modified = new Date().toISOString();
    
    servers[name] = updatedConfig;
    await saveServers(servers);

    res.json(updatedConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete HANA server
app.delete('/api/hana-servers/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const servers = await loadServers();
    
    if (!servers[name]) {
      return res.status(404).json({ error: 'Server not found' });
    }

    delete servers[name];
    await saveServers(servers);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Apply server to Claude Desktop
app.post('/api/apply-to-claude', async (req, res) => {
  try {
    const { serverName, environment } = req.body;
    
    if (!serverName || !environment) {
      return res.status(400).json({ error: 'Server name and environment are required' });
    }

    const config = await loadConfig();
    const claudeConfigPath = config.claudeConfigPath;
    
    if (!claudeConfigPath) {
      return res.status(400).json({ error: 'Claude config path not set' });
    }

    const servers = await loadServers();
    const server = servers[serverName];
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const envConfig = server.environments?.[environment];
    if (!envConfig) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    const claudeConfig = await loadClaudeConfig(claudeConfigPath);
    
    // Create new HANA server entry
    const newHanaServer = {
      [serverName]: {
        command: 'hana-mcp-server',
        env: envConfig
      }
    };
    
    // Merge while preserving non-HANA servers
    const updatedConfig = mergeWithPreservation(claudeConfig, newHanaServer);

    await saveClaudeConfig(claudeConfigPath, updatedConfig);

    res.json({ success: true, serverName, environment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove server from Claude Desktop
app.delete('/api/claude/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    
    const config = await loadConfig();
    const claudeConfigPath = config.claudeConfigPath;
    
    if (!claudeConfigPath) {
      return res.status(400).json({ error: 'Claude config path not set' });
    }

    const claudeConfig = await loadClaudeConfig(claudeConfigPath);
    
    const serverToDelete = claudeConfig.mcpServers[serverName];
    if (!serverToDelete) {
      return res.status(404).json({ error: 'Server not found in Claude config' });
    }
    
    // Only delete if it's a HANA MCP server
    if (!isHanaMcpServer(serverToDelete)) {
      return res.status(400).json({ error: 'Cannot delete non-HANA MCP server' });
    }

    delete claudeConfig.mcpServers[serverName];
    await saveClaudeConfig(claudeConfigPath, claudeConfig);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Claude Desktop servers
app.get('/api/claude', async (req, res) => {
  try {
    const config = await loadConfig();
    const claudeConfigPath = config.claudeConfigPath;
    
    if (!claudeConfigPath) {
      return res.json([]);
    }

    const claudeConfig = await loadClaudeConfig(claudeConfigPath);
    const claudeServers = [];

    // Filter only HANA MCP servers
    const hanaServers = filterHanaMcpServers(claudeConfig.mcpServers);

    for (const [name, server] of Object.entries(hanaServers)) {
      const serverData = {
        name: name,
        environment: server.env?.ENVIRONMENT || 'Development',
        env: server.env || {}
      };
      claudeServers.push(serverData);
    }

    res.json(claudeServers);
  } catch (error) {
    console.error('Error loading Claude servers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active environments
app.get('/api/claude/active-environments', async (req, res) => {
  try {
    const config = await loadConfig();
    const claudeConfigPath = config.claudeConfigPath;
    
    if (!claudeConfigPath) {
      return res.json({});
    }

    const claudeConfig = await loadClaudeConfig(claudeConfigPath);
    const servers = await loadServers();
    const activeEnvironments = {};

    // Filter only HANA MCP servers
    const hanaServers = filterHanaMcpServers(claudeConfig.mcpServers);

    for (const [name, claudeServer] of Object.entries(hanaServers)) {
      if (servers[name]) {
        // Find which environment matches the Claude config
        const localServer = servers[name];
        for (const [envName, envConfig] of Object.entries(localServer.environments || {})) {
          if (JSON.stringify(envConfig) === JSON.stringify(claudeServer.env)) {
            activeEnvironments[name] = envName;
            break;
          }
        }
      }
    }

    res.json(activeEnvironments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate connection
app.post('/api/validate-connection', async (req, res) => {
  try {
    const config = req.body;
    
    // Basic validation
    const required = ['HANA_HOST', 'HANA_USER', 'HANA_PASSWORD', 'HANA_SCHEMA'];
    for (const field of required) {
      if (!config[field]) {
        return res.status(400).json({ 
          valid: false, 
          error: `${field} is required` 
        });
      }
    }

    // For now, just validate required fields
    // In a real implementation, you could test the actual connection
    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ valid: false, error: error.message });
  }
});

// Backup Management APIs

// Get backup history
app.get('/api/claude/backups', async (req, res) => {
  try {
    const history = await loadBackupHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create manual backup
app.post('/api/claude/backups', async (req, res) => {
  try {
    const { reason = 'Manual backup' } = req.body;
    
    const config = await loadConfig();
    const claudeConfigPath = config.claudeConfigPath;
    
    if (!claudeConfigPath) {
      return res.status(400).json({ error: 'Claude config path not set' });
    }

    const backup = await createBackup(claudeConfigPath, reason);
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore backup
app.post('/api/claude/backups/:backupId/restore', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const config = await loadConfig();
    const claudeConfigPath = config.claudeConfigPath;
    
    if (!claudeConfigPath) {
      return res.status(400).json({ error: 'Claude config path not set' });
    }

    const backup = await restoreBackup(backupId, claudeConfigPath);
    res.json({ success: true, backup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
app.delete('/api/claude/backups/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const history = await loadBackupHistory();
    const backupIndex = history.findIndex(b => b.id === backupId);
    
    if (backupIndex === -1) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = history[backupIndex];
    const backupFilePath = join(BACKUPS_DIR, backup.fileName);
    
    // Remove from history
    history.splice(backupIndex, 1);
    await saveBackupHistory(history);
    
    // Delete backup file
    if (await fs.pathExists(backupFilePath)) {
      await fs.remove(backupFilePath);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get backup details
app.get('/api/claude/backups/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const history = await loadBackupHistory();
    const backup = history.find(b => b.id === backupId);
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backupFilePath = join(BACKUPS_DIR, backup.fileName);
    if (!await fs.pathExists(backupFilePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    const backupConfig = await fs.readJson(backupFilePath);
    res.json({
      ...backup,
      config: backupConfig
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/status', async (req, res) => {
  try {
    const config = await loadConfig();
    const claudeConfigPath = config.claudeConfigPath;
    let claudeConfigExists = false;
    
    if (claudeConfigPath) {
      claudeConfigExists = await fs.pathExists(claudeConfigPath);
    }

    res.json({
      status: 'healthy',
      version: '1.0.0',
      claudeConfigPath,
      claudeConfigExists,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 HANA MCP UI Backend running on port ${PORT}`);
});