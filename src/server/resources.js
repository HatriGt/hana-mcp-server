/**
 * MCP Resources for HANA schemas and tables (URI scheme: hana:///...)
 */

const { logger } = require('../utils/logger');
const { config } = require('../utils/config');
const QueryExecutor = require('../database/query-executor');

const URI_PREFIX = 'hana:///';
const SCHEMAS_PATH = 'schemas';

/**
 * Parse HANA resource URI into parts.
 * Examples: hana:///schemas, hana:///schemas/SYS, hana:///schemas/SYS/tables/TABLES
 * @returns {{ type: 'schemas'|'schema'|'table', schemaName?: string, tableName?: string }|null}
 */
function parseHanaUri(uri) {
  if (typeof uri !== 'string' || !uri.startsWith(URI_PREFIX)) {
    return null;
  }
  const path = uri.slice(URI_PREFIX.length).replace(/\/+/g, '/').replace(/^\//, '').split('/');
  if (path.length === 1 && path[0] === SCHEMAS_PATH) {
    return { type: 'schemas' };
  }
  if (path.length >= 2 && path[0] === SCHEMAS_PATH) {
    const schemaName = path[1];
    if (path.length === 2) {
      return { type: 'schema', schemaName };
    }
    if (path.length === 4 && path[2] === 'tables') {
      return { type: 'table', schemaName, tableName: path[3] };
    }
  }
  return null;
}

/**
 * Build HANA resource URI from parts
 */
function buildUri(type, schemaName, tableName) {
  if (type === 'schemas') return `${URI_PREFIX}schemas`;
  if (type === 'schema') return `${URI_PREFIX}schemas/${encodeURIComponent(schemaName)}`;
  if (type === 'table') return `${URI_PREFIX}schemas/${encodeURIComponent(schemaName)}/tables/${encodeURIComponent(tableName)}`;
  return null;
}

/**
 * List resources with optional cursor pagination
 * @param {string} [cursor]
 * @returns {Promise<{ resources: object[], nextCursor?: string }>}
 */
async function listResources(cursor) {
  const pageSize = 50;
  let start = 0;
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (typeof parsed.offset === 'number' && parsed.offset >= 0) {
        start = parsed.offset;
      }
    } catch (_) {
      start = 0;
    }
  }

  const client = await require('../database/connection-manager').connectionManager.getClient();
  if (!client) {
    return { resources: [], nextCursor: undefined };
  }

  try {
    const allSchemas = await QueryExecutor.getSchemas();
    const defaultSchema = config.getDefaultSchema();
    const all = [
      { uri: buildUri('schemas'), name: 'schemas', title: 'HANA schemas', description: 'List of schema names in the HANA database', mimeType: 'application/json' },
      ...allSchemas.map(schemaName => ({
        uri: buildUri('schema', schemaName),
        name: schemaName,
        title: `Schema ${schemaName}`,
        description: defaultSchema === schemaName ? `Default schema (${schemaName})` : `Schema ${schemaName}`,
        mimeType: 'application/json'
      }))
    ];
    const page = all.slice(start, start + pageSize);
    const hasMore = start + page.length < all.length;
    const nextCursor = hasMore ? Buffer.from(JSON.stringify({ offset: start + page.length }), 'utf8').toString('base64') : undefined;
    return { resources: page, nextCursor };
  } catch (err) {
    logger.error('resources/list failed:', err.message);
    return { resources: [], nextCursor: undefined };
  }
}

/**
 * Read a single resource by URI
 * @param {string} uri
 * @returns {Promise<{ contents: object[] }>}
 */
async function readResource(uri) {
  const parsed = parseHanaUri(uri);
  if (!parsed) {
    throw Object.assign(new Error('Resource not found'), { code: -32002, data: { uri } });
  }

  const client = await require('../database/connection-manager').connectionManager.getClient();
  if (!client) {
    throw Object.assign(new Error('No database connection'), { code: -32001 });
  }

  try {
    if (parsed.type === 'schemas') {
      const schemas = await QueryExecutor.getSchemas();
      const text = JSON.stringify({ schemas }, null, 2);
      return {
        contents: [{ uri, mimeType: 'application/json', text }]
      };
    }

    if (parsed.type === 'schema') {
      const tables = await QueryExecutor.getTables(parsed.schemaName);
      const text = JSON.stringify({ schema: parsed.schemaName, tables }, null, 2);
      return {
        contents: [{ uri, mimeType: 'application/json', text }]
      };
    }

    if (parsed.type === 'table') {
      const columns = await QueryExecutor.getTableColumns(parsed.schemaName, parsed.tableName);
      const rows = columns.map(c => ({
        name: c.COLUMN_NAME,
        dataType: c.DATA_TYPE_NAME,
        length: c.LENGTH,
        scale: c.SCALE,
        nullable: c.IS_NULLABLE === 'TRUE',
        default: c.DEFAULT_VALUE,
        position: c.POSITION,
        comments: c.COMMENTS
      }));
      const text = JSON.stringify({ schema: parsed.schemaName, table: parsed.tableName, columns: rows }, null, 2);
      return {
        contents: [{ uri, mimeType: 'application/json', text }]
      };
    }
  } catch (err) {
    logger.error('resources/read failed:', err.message);
    throw Object.assign(new Error(err.message || 'Resource read failed'), { code: -32603, data: { uri } });
  }

  throw Object.assign(new Error('Resource not found'), { code: -32002, data: { uri } });
}

/**
 * List resource templates (parameterized URIs)
 */
function listResourceTemplates() {
  return {
    resourceTemplates: [
      {
        uriTemplate: `${URI_PREFIX}schemas/{schemaName}`,
        name: 'Schema tables',
        title: 'HANA schema tables',
        description: 'Tables in a given schema. Replace {schemaName} with the schema name.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: `${URI_PREFIX}schemas/{schemaName}/tables/{tableName}`,
        name: 'Table structure',
        title: 'HANA table structure',
        description: 'Column metadata for a table. Replace {schemaName} and {tableName}.',
        mimeType: 'application/json'
      }
    ]
  };
}

module.exports = {
  parseHanaUri,
  buildUri,
  listResources,
  readResource,
  listResourceTemplates,
  URI_PREFIX
};
