/**
 * Discovery tools — constraints, stats, views, synonyms, procedures,
 * column search, sample data, explain plan, foreign keys, privileges.
 */

const { logger } = require('../utils/logger');
const { config } = require('../utils/config');
const QueryExecutor = require('../database/query-executor');
const Validators = require('../utils/validators');
const Formatters = require('../utils/formatters');
const { redactSecrets } = require('../utils/sensitive-redact');
const { resolveCatalogDatabase } = require('../utils/catalog-utils');
const { shapeRows } = require('../database/query-runner');

// ─── helpers ────────────────────────────────────────────────────────────────

function _schema(args) {
  let s = args && args.schema_name ? String(args.schema_name).trim() : '';
  if (!s && config.hasDefaultSchema()) s = config.getDefaultSchema();
  return s;
}

function _pageArgs(args) {
  const limits    = config.getQueryLimits();
  const defaultCap = limits.listDefaultLimit;
  const rawLimit  = args && args.limit != null ? Number(args.limit) : defaultCap;
  const limit     = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultCap), defaultCap);
  const offset    = Math.max(0, args && args.offset != null ? Number(args.offset) || 0 : 0);
  const prefix    = args && args.prefix != null ? String(args.prefix) : '';
  return { limit, offset, prefix };
}

// ─── DiscoveryTools ─────────────────────────────────────────────────────────

class DiscoveryTools {

  // ── hana_list_constraints ─────────────────────────────────────────────────

  static async listConstraints(args) {
    logger.tool('hana_list_constraints', args);
    const schema_name = _schema(args);
    const { table_name } = args || {};

    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!table_name)  return Formatters.createErrorResponse('table_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const tv = Validators.validateTableName(table_name);
    if (!tv.valid) return Formatters.createErrorResponse('Invalid table name', tv.error);

    const { catalogDatabase, error: catErr } = resolveCatalogDatabase(args);
    if (catErr) return Formatters.createErrorResponse('Invalid metadata catalog', catErr);

    try {
      const [constraints, fkRows] = await Promise.all([
        QueryExecutor.getConstraints(schema_name, table_name, catalogDatabase),
        QueryExecutor.getReferentialConstraints(schema_name, table_name, catalogDatabase)
      ]);

      const grouped = { primaryKey: [], unique: [], check: [] };
      for (const r of constraints) {
        const entry = { constraintName: r.CONSTRAINT_NAME, column: r.COLUMN_NAME, position: r.POSITION };
        if (r.IS_PRIMARY_KEY === 'TRUE') grouped.primaryKey.push(entry);
        else if (r.IS_UNIQUE_KEY === 'TRUE') grouped.unique.push(entry);
        else grouped.check.push(entry);
      }

      const foreignKeys = fkRows.map(r => ({
        constraintName: r.CONSTRAINT_NAME,
        column: r.COLUMN_NAME,
        referencedSchema: r.REFERENCED_SCHEMA_NAME,
        referencedTable: r.REFERENCED_TABLE_NAME,
        referencedColumn: r.REFERENCED_COLUMN_NAME,
        deleteRule: r.DELETE_RULE || 'RESTRICT'
      }));

      const structured = { schema: schema_name, table: table_name, ...grouped, foreignKeys };
      const summary = `Constraints for ${schema_name}.${table_name}: PK cols=${grouped.primaryKey.length}, unique=${grouped.unique.length}, check=${grouped.check.length}, FK=${foreignKeys.length}`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_constraints failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error listing constraints', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_get_table_stats ──────────────────────────────────────────────────

  static async getTableStats(args) {
    logger.tool('hana_get_table_stats', args);
    const schema_name = _schema(args);
    const { table_name } = args || {};

    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!table_name)  return Formatters.createErrorResponse('table_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const tv = Validators.validateTableName(table_name);
    if (!tv.valid) return Formatters.createErrorResponse('Invalid table name', tv.error);

    try {
      const { meta, diskBytes, diskSizeUnavailable } = await QueryExecutor.getTableStats(schema_name, table_name);
      if (!meta) return Formatters.createErrorResponse(`Table ${schema_name}.${table_name} not found`);

      const structured = {
        schema: schema_name,
        table: table_name,
        rowCount: meta.RECORD_COUNT != null ? Number(meta.RECORD_COUNT) : null,
        tableType: meta.TABLE_TYPE,
        isColumnTable: meta.IS_COLUMN_TABLE === 'TRUE',
        hasPrimaryKey: meta.HAS_PRIMARY_KEY === 'TRUE',
        diskBytes,
        diskSizeUnavailable
      };

      let summary = `Stats for ${schema_name}.${table_name}: rows=${structured.rowCount ?? 'N/A'}, type=${structured.tableType}`;
      if (diskBytes != null) summary += `, disk=${(diskBytes / 1024).toFixed(1)}KB`;
      else if (diskSizeUnavailable) summary += ', disk=unavailable (requires MONITORING privilege)';

      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_get_table_stats failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error getting table stats', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_list_views ───────────────────────────────────────────────────────

  static async listViews(args) {
    logger.tool('hana_list_views', args);
    const schema_name = _schema(args);
    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);

    const { limit, offset, prefix } = _pageArgs(args);

    try {
      const { rows, total } = await QueryExecutor.getViewsPage(schema_name, prefix, limit, offset);
      const truncated  = offset + rows.length < total;
      const nextOffset = truncated ? offset + rows.length : null;
      const items = rows.map(r => ({
        viewName: r.VIEW_NAME,
        hasParameters: r.HAS_PARAMETERS === 'TRUE',
        readOnly: r.READ_ONLY === 'TRUE'
      }));
      const structured = { items, returned: items.length, totalAvailable: total, truncated, nextOffset: truncated ? nextOffset : null };
      const summary = `Views in ${schema_name}: showing ${items.length} of ${total}${truncated ? `. nextOffset=${nextOffset}` : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_views failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error listing views', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_describe_view ────────────────────────────────────────────────────

  static async describeView(args) {
    logger.tool('hana_describe_view', args);
    const schema_name = _schema(args);
    const { view_name } = args || {};

    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!view_name)   return Formatters.createErrorResponse('view_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const vv = Validators.validateTableName(view_name);
    if (!vv.valid) return Formatters.createErrorResponse('Invalid view name', vv.error);

    const { catalogDatabase, error: catErr } = resolveCatalogDatabase(args);
    if (catErr) return Formatters.createErrorResponse('Invalid metadata catalog', catErr);

    try {
      const [viewDef, columns] = await Promise.all([
        QueryExecutor.getViewDefinition(schema_name, view_name, catalogDatabase),
        QueryExecutor.getViewColumns(schema_name, view_name, catalogDatabase)
      ]);

      if (!viewDef) return Formatters.createErrorResponse(`View ${schema_name}.${view_name} not found`);

      const maxCellChars = config.getQueryLimits().maxCellChars;
      let definition = viewDef.DEFINITION || '';
      const definitionTruncated = definition.length > maxCellChars;
      if (definitionTruncated) definition = definition.slice(0, maxCellChars) + '…';

      const structured = {
        schema: schema_name,
        viewName: view_name,
        hasParameters: viewDef.HAS_PARAMETERS === 'TRUE',
        readOnly: viewDef.READ_ONLY === 'TRUE',
        createTime: viewDef.CREATE_TIME ? String(viewDef.CREATE_TIME) : null,
        definition,
        definitionTruncated,
        columns: columns.map(c => ({
          name: c.COLUMN_NAME,
          dataType: c.DATA_TYPE_NAME,
          length: c.LENGTH,
          scale: c.SCALE,
          nullable: c.IS_NULLABLE === 'TRUE',
          position: c.POSITION,
          comments: c.COMMENTS || null
        }))
      };

      const summary = `View ${schema_name}.${view_name}: ${columns.length} column(s)`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_describe_view failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error describing view', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_list_synonyms ────────────────────────────────────────────────────

  static async listSynonyms(args) {
    logger.tool('hana_list_synonyms', args);
    const schema_name = _schema(args);
    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);

    const { limit, offset, prefix } = _pageArgs(args);

    try {
      const { rows, total } = await QueryExecutor.getSynonymsPage(schema_name, prefix, limit, offset);
      const truncated  = offset + rows.length < total;
      const nextOffset = truncated ? offset + rows.length : null;
      const items = rows.map(r => ({
        synonymName: r.SYNONYM_NAME,
        objectSchema: r.OBJECT_SCHEMA,
        objectName: r.OBJECT_NAME,
        objectType: r.OBJECT_TYPE
      }));
      const structured = { items, returned: items.length, totalAvailable: total, truncated, nextOffset: truncated ? nextOffset : null };
      const summary = `Synonyms in ${schema_name}: showing ${items.length} of ${total}${truncated ? `. nextOffset=${nextOffset}` : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_synonyms failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error listing synonyms', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_list_procedures ──────────────────────────────────────────────────

  static async listProcedures(args) {
    logger.tool('hana_list_procedures', args);
    const schema_name = _schema(args);
    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);

    const { limit, offset, prefix } = _pageArgs(args);

    try {
      const { rows, total } = await QueryExecutor.getProceduresPage(schema_name, prefix, limit, offset);
      const truncated  = offset + rows.length < total;
      const nextOffset = truncated ? offset + rows.length : null;
      const items = rows.map(r => ({
        procedureName: r.PROCEDURE_NAME,
        inputParams:   r.INPUT_PARAMETER_COUNT,
        outputParams:  r.OUTPUT_PARAMETER_COUNT,
        inoutParams:   r.INOUT_PARAMETER_COUNT,
        hasResultSet:  r.RESULT_SET_COUNT != null ? Number(r.RESULT_SET_COUNT) > 0 : false,
        createTime:    r.CREATE_TIME ? String(r.CREATE_TIME) : null
      }));
      const structured = { items, returned: items.length, totalAvailable: total, truncated, nextOffset: truncated ? nextOffset : null };
      const summary = `Procedures in ${schema_name}: showing ${items.length} of ${total}${truncated ? `. nextOffset=${nextOffset}` : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_procedures failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error listing procedures', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_describe_procedure ───────────────────────────────────────────────

  static async describeProcedure(args) {
    logger.tool('hana_describe_procedure', args);
    const schema_name = _schema(args);
    const { procedure_name } = args || {};

    if (!schema_name)     return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!procedure_name)  return Formatters.createErrorResponse('procedure_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const pv = Validators.validateTableName(procedure_name);
    if (!pv.valid) return Formatters.createErrorResponse('Invalid procedure name', pv.error);

    const { catalogDatabase, error: catErr } = resolveCatalogDatabase(args);
    if (catErr) return Formatters.createErrorResponse('Invalid metadata catalog', catErr);

    try {
      const params = await QueryExecutor.getProcedureParameters(schema_name, procedure_name, catalogDatabase);
      const structured = {
        schema: schema_name,
        procedureName: procedure_name,
        parameters: params.map(p => ({
          name:           p.PARAMETER_NAME,
          dataType:       p.DATA_TYPE_NAME,
          length:         p.LENGTH,
          scale:          p.SCALE,
          parameterType:  p.PARAMETER_TYPE,
          hasDefault:     p.HAS_DEFAULT_VALUE === 'TRUE',
          position:       p.POSITION
        }))
      };
      const summary = `Procedure ${schema_name}.${procedure_name}: ${params.length} parameter(s)`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_describe_procedure failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error describing procedure', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_search_columns ───────────────────────────────────────────────────

  static async searchColumns(args) {
    logger.tool('hana_search_columns', args);
    const { column_pattern, schema_name } = args || {};

    if (!column_pattern) return Formatters.createErrorResponse('column_pattern is required');

    const pv = Validators.validateColumnPattern(column_pattern);
    if (!pv.valid) return Formatters.createErrorResponse('Invalid column pattern', pv.error);

    if (schema_name) {
      const sv = Validators.validateSchemaName(schema_name);
      if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    }

    const limits   = config.getQueryLimits();
    const rawLimit = args.limit != null ? Number(args.limit) : limits.listDefaultLimit;
    const limit    = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : limits.listDefaultLimit), 1000);

    try {
      const rows = await QueryExecutor.searchColumns(column_pattern, schema_name || null, limit);
      const structured = {
        pattern: column_pattern,
        schema:  schema_name || null,
        returned: rows.length,
        capped: rows.length === limit,
        columns: rows.map(r => ({
          schema:   r.SCHEMA_NAME,
          table:    r.TABLE_NAME,
          column:   r.COLUMN_NAME,
          dataType: r.DATA_TYPE_NAME,
          length:   r.LENGTH,
          nullable: r.IS_NULLABLE === 'TRUE'
        }))
      };
      const summary = `Column search '${column_pattern}'${schema_name ? ` in ${schema_name}` : ''}: ${rows.length} match(es)${structured.capped ? ' (limit reached)' : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_search_columns failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error searching columns', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_get_sample_data ──────────────────────────────────────────────────

  static async getSampleData(args) {
    logger.tool('hana_get_sample_data', args);
    const schema_name = _schema(args);
    const { table_name } = args || {};

    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!table_name)  return Formatters.createErrorResponse('table_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const tv = Validators.validateTableName(table_name);
    if (!tv.valid) return Formatters.createErrorResponse('Invalid table name', tv.error);

    const limits   = config.getQueryLimits();
    const rawLimit = args.limit != null ? Number(args.limit) : 10;
    const limit    = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 10), limits.maxResultRows || 50);

    try {
      const rawRows = await QueryExecutor.getTableSample(schema_name, table_name, limit);
      const maxCols      = limits.maxResultCols || 50;
      const maxCellChars = limits.maxCellChars  || 200;
      const shaped = shapeRows(rawRows, maxCols, maxCellChars, limit);

      const runResult = {
        kind: 'select',
        columns: shaped.columns,
        rows: shaped.dataRows,
        truncated: false,
        returnedRows: shaped.dataRows.length,
        maxRows: limit,
        offset: 0,
        nextOffset: null,
        totalRows: null,
        columnsOmitted: shaped.columnsOmitted || 0,
        appliedWrap: false
      };

      const Formatters2 = require('../utils/formatters');
      return Formatters2.formatQueryToolResult(runResult, `SELECT TOP ${limit} * FROM "${schema_name}"."${table_name}"`);
    } catch (err) {
      logger.error('hana_get_sample_data failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error getting sample data', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_explain_plan ─────────────────────────────────────────────────────

  static async explainPlan(args) {
    logger.tool('hana_explain_plan', args);
    const { query } = args || {};

    if (!query) return Formatters.createErrorResponse('query is required');

    const qv = Validators.validateQuery(query, { mode: 'select-only' });
    if (!qv.valid) return Formatters.createErrorResponse('Invalid query for explain plan', qv.error);

    try {
      const planRows = await QueryExecutor.explainPlan(query);
      const structured = {
        query: query.slice(0, 200),
        planRows: planRows.map(r => ({
          operatorId:       r.OPERATOR_ID,
          parentOperatorId: r.PARENT_OPERATOR_ID,
          level:            r.LEVEL,
          operatorName:     r.OPERATOR_NAME,
          operatorDetails:  r.OPERATOR_DETAILS,
          objectName:       r.TABLE_NAME,
          schemaName:       r.SCHEMA_NAME,
          tableSize:        r.TABLE_SIZE,
          outputSize:       r.OUTPUT_SIZE,
          subtreeCost:      r.SUBTREE_COST,
          executionEngine:  r.EXECUTION_ENGINE
        }))
      };
      const summary = `Explain plan: ${planRows.length} operator(s). Top operator: ${planRows.length > 0 ? planRows[0].OPERATOR_NAME : 'N/A'}`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_explain_plan failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error explaining plan', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_list_foreign_keys ────────────────────────────────────────────────

  static async listForeignKeys(args) {
    logger.tool('hana_list_foreign_keys', args);
    const schema_name = _schema(args);
    const { table_name } = args || {};

    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!table_name)  return Formatters.createErrorResponse('table_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const tv = Validators.validateTableName(table_name);
    if (!tv.valid) return Formatters.createErrorResponse('Invalid table name', tv.error);

    const { catalogDatabase, error: catErr } = resolveCatalogDatabase(args);
    if (catErr) return Formatters.createErrorResponse('Invalid metadata catalog', catErr);

    try {
      const rows = await QueryExecutor.getReferentialConstraints(schema_name, table_name, catalogDatabase);
      const structured = {
        schema: schema_name,
        table:  table_name,
        foreignKeys: rows.map(r => ({
          constraintName:    r.CONSTRAINT_NAME,
          column:            r.COLUMN_NAME,
          referencedSchema:  r.REFERENCED_SCHEMA_NAME,
          referencedTable:   r.REFERENCED_TABLE_NAME,
          referencedColumn:  r.REFERENCED_COLUMN_NAME,
          deleteRule:        r.DELETE_RULE || 'RESTRICT'
        }))
      };
      const summary = `Foreign keys for ${schema_name}.${table_name}: ${rows.length} FK reference(s)`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_foreign_keys failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error listing foreign keys', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_list_privileges ──────────────────────────────────────────────────

  static async listPrivileges(args) {
    logger.tool('hana_list_privileges', args);
    const { grantee } = args || {};

    if (grantee) {
      const gv = Validators.validateSchemaName(grantee);
      if (!gv.valid) return Formatters.createErrorResponse('Invalid grantee name', gv.error);
    }

    try {
      const rows = await QueryExecutor.getEffectivePrivileges(grantee || null);
      const forUser = grantee || 'CURRENT_USER';
      const structured = {
        grantee: forUser,
        returned: rows.length,
        capped: rows.length === 500,
        privileges: rows.map(r => ({
          privilege:   r.PRIVILEGE,
          objectType:  r.OBJECT_TYPE,
          schema:      r.SCHEMA_NAME,
          object:      r.OBJECT_NAME,
          isGrantable: r.IS_GRANTABLE === 'TRUE'
        }))
      };
      const summary = `Privileges for ${forUser}: ${rows.length} privilege(s)${structured.capped ? ' (capped at 500)' : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_privileges failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse(
        'Error listing privileges',
        err.sqlCode != null
          ? err.message
          : `${err.message} — this tool requires CATALOG READ privilege or the grantee must be the current user.`,
        err.sqlCode,
        err.sqlState
      );
    }
  }
  // ── hana_get_ddl ─────────────────────────────────────────────────────────

  static async getDDL(args) {
    logger.tool('hana_get_ddl', args);
    const schema_name = _schema(args);
    const { object_name, object_type } = args || {};

    if (!schema_name)  return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!object_name)  return Formatters.createErrorResponse('object_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const ov = Validators.validateTableName(object_name);
    if (!ov.valid) return Formatters.createErrorResponse('Invalid object name', ov.error);

    const validTypes = ['TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'SEQUENCE'];
    if (object_type && !validTypes.includes(object_type.toUpperCase())) {
      return Formatters.createErrorResponse(`Invalid object_type. Must be one of: ${validTypes.join(', ')}`);
    }

    try {
      const rows = await QueryExecutor.getObjectDDL(schema_name, object_name, object_type || null);
      if (rows.length === 0) return Formatters.createErrorResponse(`No DDL found for ${schema_name}.${object_name}${object_type ? ` (type: ${object_type})` : ''}`);

      const maxCellChars = config.getQueryLimits().maxCellChars;
      const items = rows.map(r => {
        let def = r.DEFINITION || '';
        const truncated = def.length > maxCellChars;
        if (truncated) def = def.slice(0, maxCellChars) + '…';
        return { objectType: r.OBJECT_TYPE, schema: r.SCHEMA_NAME, objectName: r.OBJECT_NAME, definition: def, truncated };
      });

      const structured = { schema: schema_name, objectName: object_name, items };
      const summary = `DDL for ${schema_name}.${object_name}: ${items.length} definition(s) found`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_get_ddl failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error getting DDL', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_get_column_stats ─────────────────────────────────────────────────

  static async getColumnStats(args) {
    logger.tool('hana_get_column_stats', args);
    const schema_name = _schema(args);
    const { table_name, column_name, live } = args || {};

    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!table_name)  return Formatters.createErrorResponse('table_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const tv = Validators.validateTableName(table_name);
    if (!tv.valid) return Formatters.createErrorResponse('Invalid table name', tv.error);

    if (column_name) {
      const cv = Validators.validateTableName(column_name);
      if (!cv.valid) return Formatters.createErrorResponse('Invalid column name', cv.error);
    }

    const useLive = live === true || live === 'true';

    try {
      if (useLive) {
        if (!column_name) return Formatters.createErrorResponse('column_name is required when live=true');
        const stats = await QueryExecutor.getColumnStatisticsLive(schema_name, table_name, column_name);
        const structured = { schema: schema_name, table: table_name, column: column_name, source: 'live', ...stats };
        const summary = `Live stats for ${schema_name}.${table_name}.${column_name}: totalRows=${stats.totalRows}, nullPct=${stats.nullPercent}%, distinct=${stats.distinctCount}`;
        return Formatters.createResponse(summary, 'text', structured);
      }

      const rows = await QueryExecutor.getColumnStatistics(schema_name, table_name, column_name || null);
      const columns = rows.map(r => ({
        column:        r.COLUMN_NAME,
        distinctCount: r.DISTINCT_COUNT != null ? Number(r.DISTINCT_COUNT) : null,
        nullCount:     r.NULL_COUNT     != null ? Number(r.NULL_COUNT)     : null,
        minValue:      r.MIN_VALUE      != null ? String(r.MIN_VALUE)      : null,
        maxValue:      r.MAX_VALUE      != null ? String(r.MAX_VALUE)      : null,
        lastRefresh:   r.LAST_REFRESH_TIME ? String(r.LAST_REFRESH_TIME) : null
      }));
      const structured = { schema: schema_name, table: table_name, source: 'SYS.COLUMN_STATISTICS', columns };
      const summary = `Column statistics for ${schema_name}.${table_name}: ${columns.length} column(s). Use live=true for fresh counts.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_get_column_stats failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error getting column stats', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_list_functions ───────────────────────────────────────────────────

  static async listFunctions(args) {
    logger.tool('hana_list_functions', args);
    const schema_name = _schema(args);
    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);

    const { limit, offset, prefix } = _pageArgs(args);

    try {
      const { rows, total } = await QueryExecutor.getFunctionsPage(schema_name, prefix, limit, offset);
      const truncated  = offset + rows.length < total;
      const nextOffset = truncated ? offset + rows.length : null;
      const items = rows.map(r => ({
        functionName:  r.FUNCTION_NAME,
        functionType:  r.FUNCTION_TYPE,
        inputParams:   r.INPUT_PARAMETER_COUNT,
        createTime:    r.CREATE_TIME ? String(r.CREATE_TIME) : null
      }));
      const structured = { items, returned: items.length, totalAvailable: total, truncated, nextOffset: truncated ? nextOffset : null };
      const summary = `Functions in ${schema_name}: showing ${items.length} of ${total}${truncated ? `. nextOffset=${nextOffset}` : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_functions failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error listing functions', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_describe_function ────────────────────────────────────────────────

  static async describeFunction(args) {
    logger.tool('hana_describe_function', args);
    const schema_name = _schema(args);
    const { function_name } = args || {};

    if (!schema_name)   return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!function_name) return Formatters.createErrorResponse('function_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const fv = Validators.validateTableName(function_name);
    if (!fv.valid) return Formatters.createErrorResponse('Invalid function name', fv.error);

    const { catalogDatabase, error: catErr } = resolveCatalogDatabase(args);
    if (catErr) return Formatters.createErrorResponse('Invalid metadata catalog', catErr);

    try {
      const params = await QueryExecutor.getFunctionParameters(schema_name, function_name, catalogDatabase);
      const structured = {
        schema: schema_name,
        functionName: function_name,
        parameters: params.map(p => ({
          name:          p.PARAMETER_NAME,
          dataType:      p.DATA_TYPE_NAME,
          length:        p.LENGTH,
          scale:         p.SCALE,
          parameterType: p.PARAMETER_TYPE,
          position:      p.POSITION
        }))
      };
      const summary = `Function ${schema_name}.${function_name}: ${params.length} parameter(s)`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_describe_function failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error describing function', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_list_calculation_views ───────────────────────────────────────────

  static async listCalculationViews(args) {
    logger.tool('hana_list_calculation_views', args);
    const { limit: rawLimit, offset: rawOffset, prefix: rawPrefix } = args || {};

    const limits     = config.getQueryLimits();
    const defaultCap = limits.listDefaultLimit;
    const rawL       = rawLimit != null ? Number(rawLimit) : defaultCap;
    const limit      = Math.min(Math.max(1, Number.isFinite(rawL) ? rawL : defaultCap), defaultCap);
    const offset     = Math.max(0, rawOffset != null ? Number(rawOffset) || 0 : 0);
    const prefix     = rawPrefix != null ? String(rawPrefix) : '';

    try {
      const { rows, total } = await QueryExecutor.getCalculationViewsPage(prefix, limit, offset);
      const truncated  = offset + rows.length < total;
      const nextOffset = truncated ? offset + rows.length : null;
      const items = rows.map(r => ({
        viewName:      r.VIEW_NAME,
        hasParameters: r.HAS_PARAMETERS === 'TRUE',
        readOnly:      r.READ_ONLY === 'TRUE',
        createTime:    r.CREATE_TIME ? String(r.CREATE_TIME) : null
      }));
      const structured = { schema: '_SYS_BIC', items, returned: items.length, totalAvailable: total, truncated, nextOffset: truncated ? nextOffset : null };
      const summary = `Calculation views in _SYS_BIC: showing ${items.length} of ${total}${truncated ? `. nextOffset=${nextOffset}` : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_calculation_views failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error listing calculation views', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_get_session_info ─────────────────────────────────────────────────

  static async getSessionInfo(args) {
    logger.tool('hana_get_session_info', args);
    try {
      const info = await QueryExecutor.getSessionInfo();
      const summary = `Session: user=${info.currentUser}, schema=${info.currentSchema}, db=${info.databaseName || 'N/A'}`;
      return Formatters.createResponse(summary, 'text', info);
    } catch (err) {
      logger.error('hana_get_session_info failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error getting session info', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_search_tables ────────────────────────────────────────────────────

  static async searchTables(args) {
    logger.tool('hana_search_tables', args);
    const { table_pattern, schema_name } = args || {};

    if (!table_pattern) return Formatters.createErrorResponse('table_pattern is required');

    const pv = Validators.validateColumnPattern(table_pattern);
    if (!pv.valid) return Formatters.createErrorResponse('Invalid table pattern', pv.error);

    if (schema_name) {
      const sv = Validators.validateSchemaName(schema_name);
      if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    }

    const limits   = config.getQueryLimits();
    const rawLimit = args.limit != null ? Number(args.limit) : limits.listDefaultLimit;
    const limit    = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : limits.listDefaultLimit), 2000);

    try {
      const rows = await QueryExecutor.searchTables(table_pattern, schema_name || null, limit);
      const structured = {
        pattern:  table_pattern,
        schema:   schema_name || null,
        returned: rows.length,
        capped:   rows.length === limit,
        tables:   rows.map(r => ({ schema: r.SCHEMA_NAME, table: r.TABLE_NAME, tableType: r.TABLE_TYPE }))
      };
      const summary = `Table search '${table_pattern}'${schema_name ? ` in ${schema_name}` : ''}: ${rows.length} match(es)${structured.capped ? ' (limit reached)' : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_search_tables failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error searching tables', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_get_expensive_queries ────────────────────────────────────────────

  static async getExpensiveQueries(args) {
    logger.tool('hana_get_expensive_queries', args);
    const rawLimit = args && args.limit != null ? Number(args.limit) : 20;
    const limit    = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20), 100);

    try {
      const rows = await QueryExecutor.getExpensiveQueries(limit);
      const structured = {
        returned: rows.length,
        queries: rows.map(r => ({
          hash:             r.STATEMENT_HASH,
          user:             r.DB_USER,
          application:      r.APPLICATION_NAME,
          startTime:        r.START_TIME ? String(r.START_TIME) : null,
          durationMicrosec: r.DURATION_MICROSEC != null ? Number(r.DURATION_MICROSEC) : null,
          cpuTime:          r.CPU_TIME          != null ? Number(r.CPU_TIME)           : null,
          lockWaitDuration: r.LOCK_WAIT_DURATION != null ? Number(r.LOCK_WAIT_DURATION) : null,
          records:          r.RECORDS           != null ? Number(r.RECORDS)            : null,
          statementPreview: r.STATEMENT_PREVIEW || null
        }))
      };
      const summary = `Top ${rows.length} expensive queries by duration.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_get_expensive_queries failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse(
        'Error getting expensive queries',
        err.sqlCode != null
          ? err.message
          : `${err.message} — requires MONITORING privilege to read M_EXPENSIVE_STATEMENTS.`,
        err.sqlCode,
        err.sqlState
      );
    }
  }

  // ── hana_get_dependencies ─────────────────────────────────────────────────

  static async getDependencies(args) {
    logger.tool('hana_get_dependencies', args);
    const schema_name = _schema(args);
    const { object_name, direction } = args || {};

    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!object_name) return Formatters.createErrorResponse('object_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const ov = Validators.validateTableName(object_name);
    if (!ov.valid) return Formatters.createErrorResponse('Invalid object name', ov.error);

    const validDirections = ['base', 'dependent', 'both'];
    const dir = direction && validDirections.includes(direction) ? direction : 'both';

    try {
      const rows = await QueryExecutor.getObjectDependencies(schema_name, object_name, dir);
      const structured = {
        schema: schema_name,
        objectName: object_name,
        direction: dir,
        returned: rows.length,
        capped: rows.length === 200,
        dependencies: rows.map(r => ({
          baseSchema:      r.BASE_SCHEMA_NAME,
          baseObject:      r.BASE_OBJECT_NAME,
          baseType:        r.BASE_OBJECT_TYPE,
          dependentSchema: r.DEPENDENT_SCHEMA_NAME,
          dependentObject: r.DEPENDENT_OBJECT_NAME,
          dependentType:   r.DEPENDENT_OBJECT_TYPE
        }))
      };
      const summary = `Dependencies for ${schema_name}.${object_name} (direction=${dir}): ${rows.length} relationship(s)${structured.capped ? ' (capped at 200)' : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_get_dependencies failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error getting dependencies', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_get_partition_info ───────────────────────────────────────────────

  static async getPartitionInfo(args) {
    logger.tool('hana_get_partition_info', args);
    const schema_name = _schema(args);
    const { table_name } = args || {};

    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');
    if (!table_name)  return Formatters.createErrorResponse('table_name is required');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);
    const tv = Validators.validateTableName(table_name);
    if (!tv.valid) return Formatters.createErrorResponse('Invalid table name', tv.error);

    try {
      const rows = await QueryExecutor.getPartitionInfo(schema_name, table_name);
      if (rows.length === 0) {
        return Formatters.createResponse(
          `Table ${schema_name}.${table_name} is not partitioned (or partition info unavailable).`,
          'text',
          { schema: schema_name, table: table_name, partitioned: false, partitions: [] }
        );
      }
      const structured = {
        schema: schema_name,
        table:  table_name,
        partitioned: true,
        partitionCount: rows.length,
        partitions: rows.map(r => ({
          partId:          r.PART_ID,
          partName:        r.PART_NAME || null,
          level1Partition: r.LEVEL_1_PARTITION || null,
          level2Partition: r.LEVEL_2_PARTITION || null,
          level3Partition: r.LEVEL_3_PARTITION || null,
          loadUnit:        r.LOAD_UNIT || null
        }))
      };
      const summary = `Partition info for ${schema_name}.${table_name}: ${rows.length} partition(s)`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_get_partition_info failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error getting partition info', err.message, err.sqlCode, err.sqlState);
    }
  }

  // ── hana_list_sequences ───────────────────────────────────────────────────

  static async listSequences(args) {
    logger.tool('hana_list_sequences', args);
    const schema_name = _schema(args);
    if (!schema_name) return Formatters.createErrorResponse('Schema name is required', 'Provide schema_name or set HANA_SCHEMA.');

    const sv = Validators.validateSchemaName(schema_name);
    if (!sv.valid) return Formatters.createErrorResponse('Invalid schema name', sv.error);

    const { limit, offset, prefix } = _pageArgs(args);

    try {
      const { rows, total } = await QueryExecutor.getSequencesPage(schema_name, prefix, limit, offset);
      const truncated  = offset + rows.length < total;
      const nextOffset = truncated ? offset + rows.length : null;
      const items = rows.map(r => ({
        sequenceName: r.SEQUENCE_NAME,
        startNumber:  r.START_NUMBER  != null ? Number(r.START_NUMBER)  : null,
        minValue:     r.MIN_VALUE     != null ? Number(r.MIN_VALUE)     : null,
        maxValue:     r.MAX_VALUE     != null ? Number(r.MAX_VALUE)     : null,
        incrementBy:  r.INCREMENT_BY  != null ? Number(r.INCREMENT_BY)  : null,
        isCycled:     r.IS_CYCLED === 'TRUE',
        cacheSize:    r.CACHE_SIZE    != null ? Number(r.CACHE_SIZE)    : null,
        createTime:   r.CREATE_TIME ? String(r.CREATE_TIME) : null
      }));
      const structured = { items, returned: items.length, totalAvailable: total, truncated, nextOffset: truncated ? nextOffset : null };
      const summary = `Sequences in ${schema_name}: showing ${items.length} of ${total}${truncated ? `. nextOffset=${nextOffset}` : ''}.`;
      return Formatters.createResponse(summary, 'text', structured);
    } catch (err) {
      logger.error('hana_list_sequences failed:', redactSecrets(err.message));
      return Formatters.createStructuredErrorResponse('Error listing sequences', err.message, err.sqlCode, err.sqlState);
    }
  }
}

module.exports = DiscoveryTools;
