/**
 * Query execution tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const { executeUserQuery } = require('../database/query-runner');
const Validators = require('../utils/validators');
const Formatters = require('../utils/formatters');
const { redactSecrets } = require('../utils/sensitive-redact');
const snapshotStore = require('../query-snapshot-store');

class QueryTools {
  /**
   * Execute a custom SQL query with server-side caps and structured results.
   */
  static async executeQuery(args) {
    logger.tool('hana_execute_query', args);

    const {
      query,
      parameters = [],
      offset,
      maxRows,
      limit,
      includeTotal,
      include_total
    } = args || {};

    const validation = Validators.validateRequired(args, ['query'], 'hana_execute_query');
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: query parameter is required', validation.error);
    }

    const queryValidation = Validators.validateQuery(query);
    if (!queryValidation.valid) {
      return Formatters.createErrorResponse('Invalid query', queryValidation.error);
    }

    const paramValidation = Validators.validateParameters(parameters);
    if (!paramValidation.valid) {
      return Formatters.createErrorResponse('Invalid parameters', paramValidation.error);
    }

    const effectiveMax = maxRows != null ? maxRows : limit;
    const wantTotal = includeTotal === true || include_total === true;

    try {
      const runResult = await executeUserQuery(query, parameters, {
        offset,
        maxRows: effectiveMax,
        includeTotal: wantTotal
      });

      let snapshotId;
      if (runResult.truncated && runResult.kind === 'select' && runResult.appliedWrap) {
        snapshotId = snapshotStore.createSnapshot({ query, parameters });
      }

      return Formatters.formatQueryToolResult(runResult, query, snapshotId);
    } catch (error) {
      logger.error('Query execution failed:', error.message);
      return Formatters.createErrorResponse('Query execution failed', error.message);
    }
  }

  /**
   * Continue a paged SELECT using a snapshot id.
   */
  static async queryNextPage(args) {
    logger.tool('hana_query_next_page', args);

    const validation = Validators.validateRequired(
      args,
      ['snapshot_id', 'offset'],
      'hana_query_next_page'
    );
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: snapshot_id and offset are required', validation.error);
    }

    const snap = snapshotStore.getSnapshot(args.snapshot_id);
    if (!snap) {
      return Formatters.createErrorResponse(
        'Invalid or expired snapshot_id',
        'Re-run hana_execute_query to obtain a new snapshotId (TTL: HANA_QUERY_SNAPSHOT_TTL_MS).'
      );
    }

    const offset = Math.max(0, Number(args.offset) || 0);
    const maxRows = args.max_rows != null ? args.max_rows : undefined;

    try {
      const runResult = await executeUserQuery(snap.query, snap.parameters, {
        offset,
        maxRows,
        includeTotal: false
      });

      let snapshotId;
      if (runResult.truncated && runResult.kind === 'select' && runResult.appliedWrap) {
        snapshotId = snapshotStore.createSnapshot({ query: snap.query, parameters: snap.parameters });
      }

      return Formatters.formatQueryToolResult(runResult, snap.query, snapshotId);
    } catch (error) {
      logger.error('Paged query failed:', redactSecrets(error.message));
      return Formatters.createErrorResponse('Paged query failed', error.message);
    }
  }
}

module.exports = QueryTools;
