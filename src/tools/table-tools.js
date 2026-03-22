/**
 * Table management tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const { config } = require('../utils/config');
const QueryExecutor = require('../database/query-executor');
const Validators = require('../utils/validators');
const Formatters = require('../utils/formatters');
const { redactSecrets } = require('../utils/sensitive-redact');
const { getTableSemantics } = require('../semantics/loader');

class TableTools {
  /**
   * Optional MDC database for SYS.* metadata: tool arg overrides HANA_METADATA_CATALOG_DATABASE.
   * @returns {{ catalogDatabase: string|null, error?: string }}
   */
  static _resolveCatalogDatabase(args) {
    const fromArg =
      args && args.catalog_database != null && String(args.catalog_database).trim()
        ? String(args.catalog_database).trim()
        : '';
    const fromEnv = config.getMetadataCatalogDatabase();
    const merged = fromArg || (fromEnv || '');
    if (!merged) return { catalogDatabase: null };
    const v = Validators.validateCatalogDatabaseName(merged);
    if (!v.valid) {
      const detail = fromArg
        ? `catalog_database: ${v.error}`
        : `HANA_METADATA_CATALOG_DATABASE: ${v.error}`;
      return { catalogDatabase: null, error: detail };
    }
    return { catalogDatabase: merged };
  }

  /**
   * List tables in a schema with optional prefix and pagination.
   */
  static async listTables(args) {
    logger.tool('hana_list_tables', args);

    let { schema_name, prefix } = args || {};

    if (!schema_name) {
      if (config.hasDefaultSchema()) {
        schema_name = config.getDefaultSchema();
        logger.info(`Using default schema: ${schema_name}`);
      } else {
        return Formatters.createErrorResponse(
          'Schema name is required',
          'Please provide schema_name parameter or set HANA_SCHEMA environment variable'
        );
      }
    }

    const schemaValidation = Validators.validateSchemaName(schema_name);
    if (!schemaValidation.valid) {
      return Formatters.createErrorResponse('Invalid schema name', schemaValidation.error);
    }

    const limitsConfig = config.getQueryLimits();
    const defaultCap = limitsConfig.listDefaultLimit;
    const rawLimit = args && args.limit != null ? Number(args.limit) : defaultCap;
    const limit = Math.min(
      Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultCap),
      defaultCap
    );
    const offset = Math.max(0, args && args.offset != null ? Number(args.offset) || 0 : 0);
    const namePrefix = prefix != null ? String(prefix) : '';

    const { catalogDatabase, error: catErr } = TableTools._resolveCatalogDatabase(args);
    if (catErr) {
      return Formatters.createErrorResponse('Invalid metadata catalog', catErr);
    }

    try {
      const { names, total } = await QueryExecutor.getTablesPage(
        schema_name,
        namePrefix,
        limit,
        offset,
        catalogDatabase
      );
      const truncated = offset + names.length < total;
      const nextOffset = truncated ? offset + names.length : null;
      return Formatters.formatNameListToolResult(
        `Tables in ${schema_name}`,
        names,
        total,
        names.length,
        truncated,
        nextOffset
      );
    } catch (error) {
      logger.error('Error listing tables:', error.message);
      return Formatters.createErrorResponse('Error listing tables', error.message);
    }
  }

  /**
   * Describe table structure
   */
  static async describeTable(args) {
    logger.tool('hana_describe_table', args);

    let { schema_name, table_name } = args || {};

    if (!schema_name) {
      if (config.hasDefaultSchema()) {
        schema_name = config.getDefaultSchema();
        logger.info(`Using default schema: ${schema_name}`);
      } else {
        return Formatters.createErrorResponse(
          'Schema name is required',
          'Please provide schema_name parameter or set HANA_SCHEMA environment variable'
        );
      }
    }

    const validation = Validators.validateRequired(args, ['table_name'], 'hana_describe_table');
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: table_name parameter is required', validation.error);
    }

    const schemaValidation = Validators.validateSchemaName(schema_name);
    if (!schemaValidation.valid) {
      return Formatters.createErrorResponse('Invalid schema name', schemaValidation.error);
    }

    const tableValidation = Validators.validateTableName(table_name);
    if (!tableValidation.valid) {
      return Formatters.createErrorResponse('Invalid table name', tableValidation.error);
    }

    const { catalogDatabase, error: catErr } = TableTools._resolveCatalogDatabase(args);
    if (catErr) {
      return Formatters.createErrorResponse('Invalid metadata catalog', catErr);
    }

    try {
      const columns = await QueryExecutor.getTableColumns(schema_name, table_name, catalogDatabase);

      if (columns.length === 0) {
        const loc = catalogDatabase
          ? `'${catalogDatabase}'.SYS catalog, ${schema_name}.${table_name}`
          : `'${schema_name}.${table_name}'`;
        return Formatters.createErrorResponse(
          `Table ${loc} not found or no columns available`
        );
      }

      const formattedStructure = Formatters.formatTableStructure(columns, schema_name, table_name);

      return Formatters.createResponse(formattedStructure);
    } catch (error) {
      logger.error('Error describing table:', redactSecrets(error.message));
      return Formatters.createErrorResponse('Error describing table', error.message);
    }
  }

  /**
   * Explain table: DB metadata + optional semantics overlay.
   */
  static async explainTable(args) {
    logger.tool('hana_explain_table', args);

    let { schema_name, table_name } = args || {};

    if (!schema_name) {
      if (config.hasDefaultSchema()) {
        schema_name = config.getDefaultSchema();
        logger.info(`Using default schema: ${schema_name}`);
      } else {
        return Formatters.createErrorResponse(
          'Schema name is required',
          'Provide schema_name or set HANA_SCHEMA.'
        );
      }
    }

    const validation = Validators.validateRequired(args, ['table_name'], 'hana_explain_table');
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: table_name is required', validation.error);
    }

    const schemaValidation = Validators.validateSchemaName(schema_name);
    if (!schemaValidation.valid) {
      return Formatters.createErrorResponse('Invalid schema name', schemaValidation.error);
    }

    const tableValidation = Validators.validateTableName(table_name);
    if (!tableValidation.valid) {
      return Formatters.createErrorResponse('Invalid table name', tableValidation.error);
    }

    const { catalogDatabase, error: catErr } = TableTools._resolveCatalogDatabase(args);
    if (catErr) {
      return Formatters.createErrorResponse('Invalid metadata catalog', catErr);
    }

    try {
      const columns = await QueryExecutor.getTableColumns(schema_name, table_name, catalogDatabase);
      if (columns.length === 0) {
        const loc = catalogDatabase
          ? `'${catalogDatabase}'.SYS catalog, ${schema_name}.${table_name}`
          : `'${schema_name}.${table_name}'`;
        return Formatters.createErrorResponse(
          `Table ${loc} not found or no columns available`
        );
      }

      const sem = await getTableSemantics(schema_name, table_name, catalogDatabase);
      const tableDescription = (sem && sem.description) || '';
      const semCols = (sem && sem.columns && typeof sem.columns === 'object' && sem.columns) || {};

      const outColumns = columns.map((col) => {
        const name = col.COLUMN_NAME;
        const sc = semCols[name] || semCols[name.toUpperCase()] || null;
        const entry = {
          name,
          dataType: col.DATA_TYPE_NAME,
          length: col.LENGTH,
          scale: col.SCALE,
          nullable: col.IS_NULLABLE === 'TRUE',
          default: col.DEFAULT_VALUE,
          position: col.POSITION,
          dbComments: col.COMMENTS || null
        };
        if (sc && typeof sc === 'object') {
          entry.semantics = {
            description: sc.description || sc.meaning || undefined,
            values: sc.values || sc.enum || undefined
          };
        }
        return entry;
      });

      const structured = {
        schema: schema_name,
        table: table_name,
        ...(catalogDatabase ? { catalog_database: catalogDatabase } : {}),
        tableDescription,
        columns: outColumns
      };

      const summary = `Explained ${schema_name}.${table_name}: ${outColumns.length} column(s)${
        tableDescription ? `. ${tableDescription.slice(0, 120)}${tableDescription.length > 120 ? '…' : ''}` : ''
      }`;

      return Formatters.createResponse(summary, 'text', structured, false);
    } catch (error) {
      logger.error('Error explaining table:', redactSecrets(error.message));
      return Formatters.createErrorResponse('Error explaining table', error.message);
    }
  }
}

module.exports = TableTools;
