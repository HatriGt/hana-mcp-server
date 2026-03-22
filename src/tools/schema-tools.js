/**
 * Schema exploration tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const { config } = require('../utils/config');
const QueryExecutor = require('../database/query-executor');
const Formatters = require('../utils/formatters');
const { redactSecrets } = require('../utils/sensitive-redact');

class SchemaTools {
  /**
   * List schemas with optional prefix filter and pagination.
   */
  static async listSchemas(args) {
    logger.tool('hana_list_schemas', args || {});

    const limitsConfig = config.getQueryLimits();
    const defaultCap = limitsConfig.listDefaultLimit;
    const rawLimit = args && args.limit != null ? Number(args.limit) : defaultCap;
    const limit = Math.min(
      Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultCap),
      defaultCap
    );
    const offset = Math.max(0, args && args.offset != null ? Number(args.offset) || 0 : 0);
    const prefix = args && args.prefix != null ? String(args.prefix) : '';

    try {
      const { names, total } = await QueryExecutor.getSchemasPage(prefix, limit, offset);
      const truncated = offset + names.length < total;
      const nextOffset = truncated ? offset + names.length : null;
      return Formatters.formatNameListToolResult(
        'Schemas',
        names,
        total,
        names.length,
        truncated,
        nextOffset
      );
    } catch (error) {
      logger.error('Error listing schemas:', redactSecrets(error.message));
      return Formatters.createErrorResponse('Error listing schemas', error.message);
    }
  }
}

module.exports = SchemaTools;
