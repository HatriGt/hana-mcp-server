/**
 * MCP Protocol Handler for JSON-RPC 2.0 communication
 */

const { logger } = require('../utils/logger');
const { redactSecrets } = require('../utils/sensitive-redact');
const { METHODS, ERROR_CODES, ERROR_MESSAGES, PROTOCOL_VERSIONS, SERVER_INFO, CAPABILITIES } = require('../constants/mcp-constants');
const ToolRegistry = require('../tools');
const { listResources, readResource, listResourceTemplates } = require('./resources');
const taskStore = require('./task-store');

class MCPHandler {
  /**
   * Handle MCP request
   */
  static async handleRequest(request) {
    const { id, method, params } = request;
    
    logger.method(method);
    
    try {
      switch (method) {
        case METHODS.INITIALIZE:
          return this.handleInitialize(id, params);
          
        case METHODS.TOOLS_LIST:
          return this.handleToolsList(id, params);
          
        case METHODS.TOOLS_CALL:
          return this.handleToolsCall(id, params);
          
        case METHODS.NOTIFICATIONS_INITIALIZED:
          return this.handleInitialized(id, params);
          
        case METHODS.PROMPTS_LIST:
          return this.handlePromptsList(id, params);
          
        case METHODS.RESOURCES_LIST:
          return this.handleResourcesList(id, params);
          
        case METHODS.RESOURCES_READ:
          return this.handleResourcesRead(id, params);
          
        case METHODS.RESOURCES_TEMPLATES_LIST:
          return this.handleResourcesTemplatesList(id, params);
          
        case METHODS.TASKS_GET:
          return this.handleTasksGet(id, params);
          
        case METHODS.TASKS_RESULT:
          return this.handleTasksResult(id, params);
          
        case METHODS.TASKS_LIST:
          return this.handleTasksList(id, params);
          
        case METHODS.TASKS_CANCEL:
          return this.handleTasksCancel(id, params);
          
        default:
          return this.createErrorResponse(id, ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${method}`);
      }
    } catch (error) {
      logger.error(`Error handling request: ${redactSecrets(error.message)}`);
      return this.createErrorResponse(id, ERROR_CODES.INTERNAL_ERROR, redactSecrets(error.message));
    }
  }

  /**
   * Handle initialize request
   */
  static handleInitialize(id, params) {
    logger.info('Initializing server');

    const requestedVersion = params && params.protocolVersion;
    let negotiatedVersion = PROTOCOL_VERSIONS.LATEST;

    if (requestedVersion && PROTOCOL_VERSIONS.SUPPORTED.includes(requestedVersion)) {
      negotiatedVersion = requestedVersion;
    } else if (requestedVersion && !PROTOCOL_VERSIONS.SUPPORTED.includes(requestedVersion)) {
      negotiatedVersion = PROTOCOL_VERSIONS.LATEST;
    }

    const instructions = [
      'HANA MCP Server is connected to a SAP HANA database and exposes tools for configuration, schema exploration, SQL execution, and optional business semantics.',
      'Before using the tools, ensure HANA_HOST, HANA_USER, HANA_PASSWORD and (for MDC tenants) HANA_DATABASE_NAME are configured in the server environment.',
      'Use hana_show_config, hana_test_connection, and hana_show_env_vars to inspect configuration and connectivity before running queries.',
      'hana_execute_query wraps SELECT/WITH statements with LIMIT/OFFSET (see HANA_MAX_RESULT_ROWS). structuredContent reports truncated, nextOffset, and optional snapshotId for hana_query_next_page.',
      'hana_list_schemas and hana_list_tables support prefix, limit, and offset; defaults and caps use HANA_LIST_DEFAULT_LIMIT.',
      'hana_describe_table, hana_explain_table, hana_list_indexes, and hana_describe_index accept optional catalog_database (or HANA_METADATA_CATALOG_DATABASE) to read SYS.* metadata from another MDC database (e.g. HSP) when connected to a different tenant.',
      'hana_explain_table merges SYS.TABLE_COLUMNS with optional JSON from HANA_SEMANTICS_PATH or HANA_SEMANTICS_URL.',
      'Resource reads for hana:///schemas and hana:///schemas/{schema} cap embedded lists (HANA_RESOURCE_LIST_MAX_ITEMS) and set truncated when applicable.'
    ].join(' ');
    
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: negotiatedVersion,
        capabilities: CAPABILITIES,
        serverInfo: SERVER_INFO,
        instructions
      }
    };
  }

  /**
   * Handle tools/list request
   */
  static handleToolsList(id, params) {
    logger.info('Listing tools');
    const cursor = params && params.cursor;
    const pageSize = 50;
    const { tools, nextCursor } = ToolRegistry.getToolsPaginated(cursor, pageSize);
    const result = { tools };
    if (nextCursor) result.nextCursor = nextCursor;
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  /**
   * Handle tools/call request
   */
  static async handleToolsCall(id, params) {
    const { name, arguments: args, task: taskMeta } = params || {};
    
    logger.tool(name, args);
    
    if (!ToolRegistry.hasTool(name)) {
      return this.createErrorResponse(id, ERROR_CODES.TOOL_NOT_FOUND, `Tool not found: ${name}`);
    }
    
    const validation = ToolRegistry.validateToolArgs(name, args || {});
    if (!validation.valid) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, validation.error);
    }

    const isTaskAugmented = taskMeta && typeof taskMeta === 'object';
    if (isTaskAugmented) {
      const task = taskStore.createTask(taskMeta);
      (async () => {
        try {
          const result = await ToolRegistry.executeTool(name, args || {});
          taskStore.completeTask(task.taskId, result);
        } catch (error) {
          logger.error(`Tool execution failed: ${redactSecrets(error.message)}`);
          taskStore.failTask(task.taskId, redactSecrets(error.message));
        }
      })();
      return {
        jsonrpc: '2.0',
        id,
        result: { task }
      };
    }
    
    try {
      const result = await ToolRegistry.executeTool(name, args || {});
      return { jsonrpc: '2.0', id, result };
    } catch (error) {
      logger.error(`Tool execution failed: ${redactSecrets(error.message)}`);
      return this.createErrorResponse(id, ERROR_CODES.INTERNAL_ERROR, error.message);
    }
  }

  /**
   * Handle notifications/initialized
   */
  static handleInitialized(id, params) {
    logger.info('Server initialized');
    return null; // No response for notifications
  }

  /**
   * Handle prompts/list request
   */
  static handlePromptsList(id, params) {
    logger.info('Listing prompts');
    const cursor = params && params.cursor;
    const allPrompts = [
      {
        name: 'hana_query_builder',
        description: 'Build a SQL query for HANA database',
        arguments: [{ name: 'goal', description: 'What the query should achieve', required: true }]
      },
      {
        name: 'hana_schema_explorer',
        description: 'Explore HANA database schemas and tables',
        arguments: []
      },
      {
        name: 'hana_connection_test',
        description: 'Test HANA database connection and show configuration',
        arguments: []
      }
    ];
    const pageSize = 50;
    let start = 0;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        if (typeof parsed.offset === 'number' && parsed.offset >= 0) {
          start = Math.min(parsed.offset, allPrompts.length);
        }
      } catch (_) {
        start = 0;
      }
    }
    const prompts = allPrompts.slice(start, start + pageSize);
    const hasMore = start + prompts.length < allPrompts.length;
    const result = { prompts };
    if (hasMore) {
      result.nextCursor = Buffer.from(JSON.stringify({ offset: start + prompts.length }), 'utf8').toString('base64');
    }
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  /**
   * Handle resources/list request
   */
  static async handleResourcesList(id, params) {
    logger.info('Listing resources');
    const cursor = params && params.cursor;
    try {
      const { resources, nextCursor } = await listResources(cursor);
      const result = { resources };
      if (nextCursor) result.nextCursor = nextCursor;
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      logger.error('resources/list failed:', redactSecrets(err.message));
      return this.createErrorResponse(id, ERROR_CODES.INTERNAL_ERROR, err.message);
    }
  }

  /**
   * Handle resources/read request
   */
  static async handleResourcesRead(id, params) {
    const uri = params && params.uri;
    if (!uri) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Missing params.uri');
    }
    logger.info(`Reading resource: ${uri}`);
    try {
      const result = await readResource(uri);
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      const code = err.code || ERROR_CODES.INTERNAL_ERROR;
      const message = err.message || 'Resource read failed';
      return this.createErrorResponse(id, code, message);
    }
  }

  /**
   * Handle resources/templates/list request
   */
  static handleResourcesTemplatesList(id, params) {
    logger.info('Listing resource templates');
    const result = listResourceTemplates();
    return { jsonrpc: '2.0', id, result };
  }

  /**
   * Handle tasks/get request
   */
  static handleTasksGet(id, params) {
    const taskId = params && params.taskId;
    if (!taskId) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Missing params.taskId');
    }
    const task = taskStore.getTask(taskId);
    if (!task) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Task not found or expired');
    }
    return { jsonrpc: '2.0', id, result: task };
  }

  /**
   * Handle tasks/result request
   */
  static handleTasksResult(id, params) {
    const taskId = params && params.taskId;
    if (!taskId) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Missing params.taskId');
    }
    const task = taskStore.getTask(taskId);
    if (!task) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Task not found or expired');
    }
    const payload = taskStore.getTaskResult(taskId);
    if (payload && payload.pending) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Task not yet completed');
    }
    return { jsonrpc: '2.0', id, result: payload };
  }

  /**
   * Handle tasks/list request
   */
  static handleTasksList(id, params) {
    const cursor = params && params.cursor;
    const { tasks: taskList, nextCursor } = taskStore.listTasks(cursor);
    const result = { tasks: taskList };
    if (nextCursor) result.nextCursor = nextCursor;
    return { jsonrpc: '2.0', id, result };
  }

  /**
   * Handle tasks/cancel request
   */
  static handleTasksCancel(id, params) {
    const taskId = params && params.taskId;
    if (!taskId) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Missing params.taskId');
    }
    const task = taskStore.cancelTask(taskId);
    if (!task) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Task not found or already in terminal status');
    }
    const result = {
      taskId: task.taskId,
      status: task.status,
      statusMessage: task.statusMessage,
      createdAt: task.createdAt,
      lastUpdatedAt: task.lastUpdatedAt,
      ttl: task.ttl,
      pollInterval: task.pollInterval
    };
    return { jsonrpc: '2.0', id, result };
  }

  /**
   * Create error response
   */
  static createErrorResponse(id, code, message) {
    const raw =
      message !== undefined && message !== null && String(message).length > 0
        ? String(message)
        : ERROR_MESSAGES[code] || 'Unknown error';
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message: redactSecrets(raw)
      }
    };
  }

  /**
   * Validate JSON-RPC request
   */
  static validateRequest(request) {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid request: must be an object' };
    }

    if (request.jsonrpc !== '2.0') {
      return { valid: false, error: 'Invalid JSON-RPC version' };
    }

    if (!request.method) {
      return { valid: false, error: 'Missing method' };
    }

    if (typeof request.method !== 'string') {
      return { valid: false, error: 'Method must be a string' };
    }

    return { valid: true };
  }
}

module.exports = MCPHandler; 