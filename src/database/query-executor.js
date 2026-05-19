/**
 * Query execution utilities for HANA database.
 * All user-facing queries go through withConnection so they are pool-safe.
 * Internal callers that need multi-query session state (e.g. explainPlan) also
 * use withConnection directly with a multi-step callback.
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { redactSecrets } = require('../utils/sensitive-redact');
const { connectionManager } = require('./connection-manager');
const Validators = require('../utils/validators');

class QueryExecutor {
  /**
   * Execute a query via a pooled connection.
   * @param {string} query
   * @param {Array}  parameters
   * @param {number} [timeoutMs]
   */
  static async executeQuery(query, parameters = [], timeoutMs = 0) {
    const queryValidation = Validators.validateQuery(query);
    if (!queryValidation.valid) {
      throw new Error(queryValidation.error);
    }

    const paramValidation = Validators.validateParameters(parameters);
    if (!paramValidation.valid) {
      throw new Error(paramValidation.error);
    }

    logger.debug(`Executing query: ${query}`, parameters.length > 0 ? `with ${parameters.length} parameters` : '');

    return connectionManager.withConnection(async (client) => {
      const results = await client.query(query, parameters, timeoutMs);
      logger.debug(`Query returned ${results.length} rows`);
      return results;
    });
  }

  static async executeScalarQuery(query, parameters = [], timeoutMs = 0) {
    const results = await this.executeQuery(query, parameters, timeoutMs);
    if (results.length === 0) return null;
    const firstRow = results[0];
    const firstColumn = Object.keys(firstRow)[0];
    return firstRow[firstColumn];
  }

  // ─── Schema / Table listing ────────────────────────────────────────────────

  static async getSchemasPage(prefix, limit, offset) {
    const p = prefix && String(prefix).trim() ? String(prefix).trim() : '';
    const like = p ? `${p}%` : '%';
    const countSql = `SELECT COUNT(*) AS C FROM SYS.SCHEMAS WHERE SCHEMA_NAME LIKE ?`;
    const listSql  = `SELECT SCHEMA_NAME FROM SYS.SCHEMAS WHERE SCHEMA_NAME LIKE ? ORDER BY SCHEMA_NAME LIMIT ? OFFSET ?`;
    const totalRow = await this.executeScalarQuery(countSql, [like]);
    const total = totalRow != null ? Number(totalRow) : 0;
    const results = await this.executeQuery(listSql, [like, limit, offset]);
    return { names: results.map(r => r.SCHEMA_NAME), total };
  }

  /** @returns {string} SYS or "DB".SYS for MDC cross-tenant metadata. */
  static _sysCatalogRef(catalogDatabase) {
    const t = catalogDatabase != null && typeof catalogDatabase === 'string' && catalogDatabase.trim()
      ? catalogDatabase.trim() : '';
    return t ? `"${t}".SYS` : 'SYS';
  }

  static async getTablesPage(schemaName, prefix, limit, offset, catalogDatabase) {
    const p    = prefix && String(prefix).trim() ? String(prefix).trim() : '';
    const like = p ? `${p}%` : '%';
    const sys  = this._sysCatalogRef(catalogDatabase);
    const countSql = `SELECT COUNT(*) AS C FROM ${sys}.TABLES WHERE SCHEMA_NAME = ? AND TABLE_NAME LIKE ?`;
    const listSql  = `SELECT TABLE_NAME FROM ${sys}.TABLES WHERE SCHEMA_NAME = ? AND TABLE_NAME LIKE ? ORDER BY TABLE_NAME LIMIT ? OFFSET ?`;
    const totalRow = await this.executeScalarQuery(countSql, [schemaName, like]);
    const total = totalRow != null ? Number(totalRow) : 0;
    const results = await this.executeQuery(listSql, [schemaName, like, limit, offset]);
    return { names: results.map(r => r.TABLE_NAME), total };
  }

  static async getTableColumns(schemaName, tableName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    return this.executeQuery(
      `SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE, DEFAULT_VALUE, POSITION, COMMENTS
       FROM ${sys}.TABLE_COLUMNS WHERE SCHEMA_NAME = ? AND TABLE_NAME = ? ORDER BY POSITION`,
      [schemaName, tableName]
    );
  }

  static async getTableIndexes(schemaName, tableName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    return this.executeQuery(
      `SELECT i.INDEX_NAME, i.INDEX_TYPE, ic.COLUMN_NAME
       FROM ${sys}.INDEX_COLUMNS ic
       JOIN ${sys}.INDEXES i ON ic.INDEX_NAME = i.INDEX_NAME AND ic.SCHEMA_NAME = i.SCHEMA_NAME
       WHERE ic.SCHEMA_NAME = ? AND ic.TABLE_NAME = ?
       ORDER BY ic.INDEX_NAME, ic.POSITION`,
      [schemaName, tableName]
    );
  }

  static async getIndexDetails(schemaName, tableName, indexName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    return this.executeQuery(
      `SELECT i.INDEX_NAME, i.INDEX_TYPE, ic.COLUMN_NAME, ic.POSITION, ic."ORDER" AS SORT_ORDER
       FROM ${sys}.INDEXES i
       JOIN ${sys}.INDEX_COLUMNS ic ON i.INDEX_NAME = ic.INDEX_NAME AND i.SCHEMA_NAME = ic.SCHEMA_NAME
       WHERE i.SCHEMA_NAME = ? AND i.TABLE_NAME = ? AND i.INDEX_NAME = ?
       ORDER BY ic.POSITION`,
      [schemaName, tableName, indexName]
    );
  }

  static async getTableRowCount(schemaName, tableName) {
    return this.executeScalarQuery(`SELECT COUNT(*) AS ROW_COUNT FROM "${schemaName}"."${tableName}"`);
  }

  static async getTableSample(schemaName, tableName, limit = 10) {
    return this.executeQuery(`SELECT TOP ? * FROM "${schemaName}"."${tableName}"`, [limit]);
  }

  // ─── Constraints ───────────────────────────────────────────────────────────

  static async getConstraints(schemaName, tableName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    return this.executeQuery(
      `SELECT CONSTRAINT_NAME, IS_PRIMARY_KEY, IS_UNIQUE_KEY, COLUMN_NAME, POSITION
       FROM ${sys}.CONSTRAINTS WHERE SCHEMA_NAME = ? AND TABLE_NAME = ?
       ORDER BY CONSTRAINT_NAME, POSITION`,
      [schemaName, tableName]
    );
  }

  static async getReferentialConstraints(schemaName, tableName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    return this.executeQuery(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_SCHEMA_NAME, REFERENCED_TABLE_NAME,
              REFERENCED_COLUMN_NAME, DELETE_RULE
       FROM ${sys}.REFERENTIAL_CONSTRAINTS WHERE SCHEMA_NAME = ? AND TABLE_NAME = ?
       ORDER BY CONSTRAINT_NAME, POSITION`,
      [schemaName, tableName]
    );
  }

  // ─── Table statistics ──────────────────────────────────────────────────────

  static async getTableStats(schemaName, tableName) {
    const rows = await this.executeQuery(
      `SELECT TABLE_TYPE, IS_COLUMN_TABLE, HAS_PRIMARY_KEY
       FROM SYS.TABLES WHERE SCHEMA_NAME = ? AND TABLE_NAME = ?`,
      [schemaName, tableName]
    );
    const meta = rows.length > 0 ? rows[0] : null;

    // RECORD_COUNT was removed from SYS.TABLES in HANA Cloud; use COUNT(*) for accuracy
    if (meta) {
      try {
        meta.RECORD_COUNT = await this.getTableRowCount(schemaName, tableName);
      } catch (_) {
        meta.RECORD_COUNT = null;
      }
    }

    let diskBytes = null;
    let diskSizeUnavailable = false;
    try {
      const sizeRow = await this.executeScalarQuery(
        `SELECT ALLOCATED_FIXED_PART_SIZE + ALLOCATED_VARIABLE_PART_SIZE AS TOTAL_BYTES
         FROM SYS.M_TABLE_SIZES WHERE SCHEMA_NAME = ? AND TABLE_NAME = ?`,
        [schemaName, tableName]
      );
      diskBytes = sizeRow != null ? Number(sizeRow) : null;
    } catch (_) {
      diskSizeUnavailable = true;
    }

    return { meta, diskBytes, diskSizeUnavailable };
  }

  // ─── Views ─────────────────────────────────────────────────────────────────

  static async getViewsPage(schemaName, prefix, limit, offset) {
    const like = prefix && String(prefix).trim() ? `${String(prefix).trim()}%` : '%';
    const countSql = `SELECT COUNT(*) AS C FROM SYS.VIEWS WHERE SCHEMA_NAME = ? AND VIEW_NAME LIKE ?`;
    const listSql  = `SELECT VIEW_NAME, HAS_PARAMETERS, READ_ONLY FROM SYS.VIEWS
                      WHERE SCHEMA_NAME = ? AND VIEW_NAME LIKE ? ORDER BY VIEW_NAME LIMIT ? OFFSET ?`;
    const totalRow = await this.executeScalarQuery(countSql, [schemaName, like]);
    const total    = totalRow != null ? Number(totalRow) : 0;
    const results  = await this.executeQuery(listSql, [schemaName, like, limit, offset]);
    return { rows: results, total };
  }

  static async getViewDefinition(schemaName, viewName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    const rows = await this.executeQuery(
      `SELECT VIEW_NAME, DEFINITION, HAS_PARAMETERS, READ_ONLY, CREATE_TIME
       FROM ${sys}.VIEWS WHERE SCHEMA_NAME = ? AND VIEW_NAME = ?`,
      [schemaName, viewName]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async getViewColumns(schemaName, viewName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    return this.executeQuery(
      `SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE, POSITION, COMMENTS
       FROM ${sys}.VIEW_COLUMNS WHERE SCHEMA_NAME = ? AND VIEW_NAME = ? ORDER BY POSITION`,
      [schemaName, viewName]
    );
  }

  // ─── Synonyms ──────────────────────────────────────────────────────────────

  static async getSynonymsPage(schemaName, prefix, limit, offset) {
    const like = prefix && String(prefix).trim() ? `${String(prefix).trim()}%` : '%';
    const countSql = `SELECT COUNT(*) AS C FROM SYS.SYNONYMS WHERE SCHEMA_NAME = ? AND SYNONYM_NAME LIKE ?`;
    const listSql  = `SELECT SYNONYM_NAME, OBJECT_SCHEMA, OBJECT_NAME, OBJECT_TYPE
                      FROM SYS.SYNONYMS WHERE SCHEMA_NAME = ? AND SYNONYM_NAME LIKE ?
                      ORDER BY SYNONYM_NAME LIMIT ? OFFSET ?`;
    const totalRow = await this.executeScalarQuery(countSql, [schemaName, like]);
    const total    = totalRow != null ? Number(totalRow) : 0;
    const results  = await this.executeQuery(listSql, [schemaName, like, limit, offset]);
    return { rows: results, total };
  }

  // ─── Procedures ────────────────────────────────────────────────────────────

  static async getProceduresPage(schemaName, prefix, limit, offset) {
    const like = prefix && String(prefix).trim() ? `${String(prefix).trim()}%` : '%';
    const countSql = `SELECT COUNT(*) AS C FROM SYS.PROCEDURES WHERE SCHEMA_NAME = ? AND PROCEDURE_NAME LIKE ?`;
    const listSql  = `SELECT PROCEDURE_NAME, INPUT_PARAMETER_COUNT, OUTPUT_PARAMETER_COUNT,
                             INOUT_PARAMETER_COUNT, HAS_RESULT_SET, CREATE_TIME
                      FROM SYS.PROCEDURES WHERE SCHEMA_NAME = ? AND PROCEDURE_NAME LIKE ?
                      ORDER BY PROCEDURE_NAME LIMIT ? OFFSET ?`;
    const totalRow = await this.executeScalarQuery(countSql, [schemaName, like]);
    const total    = totalRow != null ? Number(totalRow) : 0;
    const results  = await this.executeQuery(listSql, [schemaName, like, limit, offset]);
    return { rows: results, total };
  }

  static async getProcedureParameters(schemaName, procedureName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    return this.executeQuery(
      `SELECT PARAMETER_NAME, DATA_TYPE_NAME, LENGTH, SCALE, PARAMETER_TYPE,
              HAS_DEFAULT_VALUE, POSITION
       FROM ${sys}.PROCEDURE_PARAMETERS
       WHERE SCHEMA_NAME = ? AND PROCEDURE_NAME = ?
       ORDER BY POSITION`,
      [schemaName, procedureName]
    );
  }

  // ─── Column search ─────────────────────────────────────────────────────────

  static async searchColumns(columnPattern, schemaName, limit) {
    if (schemaName) {
      return this.executeQuery(
        `SELECT SCHEMA_NAME, TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, LENGTH, IS_NULLABLE
         FROM SYS.TABLE_COLUMNS WHERE COLUMN_NAME LIKE ? AND SCHEMA_NAME = ?
         ORDER BY SCHEMA_NAME, TABLE_NAME, COLUMN_NAME LIMIT ?`,
        [columnPattern, schemaName, limit]
      );
    }
    return this.executeQuery(
      `SELECT SCHEMA_NAME, TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, LENGTH, IS_NULLABLE
       FROM SYS.TABLE_COLUMNS WHERE COLUMN_NAME LIKE ?
       ORDER BY SCHEMA_NAME, TABLE_NAME, COLUMN_NAME LIMIT ?`,
      [columnPattern, limit]
    );
  }

  // ─── Privileges ────────────────────────────────────────────────────────────

  static async getEffectivePrivileges(grantee) {
    if (grantee) {
      return this.executeQuery(
        `SELECT PRIVILEGE, OBJECT_TYPE, SCHEMA_NAME, OBJECT_NAME, IS_GRANTABLE
         FROM SYS.EFFECTIVE_PRIVILEGES WHERE GRANTEE = ?
         ORDER BY PRIVILEGE, SCHEMA_NAME, OBJECT_NAME LIMIT 500`,
        [grantee]
      );
    }
    return this.executeQuery(
      `SELECT PRIVILEGE, OBJECT_TYPE, SCHEMA_NAME, OBJECT_NAME, IS_GRANTABLE
       FROM SYS.EFFECTIVE_PRIVILEGES WHERE GRANTEE = CURRENT_USER
       ORDER BY PRIVILEGE, SCHEMA_NAME, OBJECT_NAME LIMIT 500`
    );
  }

  // ─── Explain plan ──────────────────────────────────────────────────────────

  /**
   * Run EXPLAIN PLAN for a SELECT/WITH query on a single dedicated connection.
   * Cleans up EXPLAIN_PLAN_TABLE entries even if the read step fails.
   */
  static async explainPlan(query) {
    const stmtName = crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();

    return connectionManager.withConnection(async (client) => {
      // Step 1: Generate plan
      await client.query(`EXPLAIN PLAN SET STATEMENT_NAME = '${stmtName}' FOR ${query}`);

      let planRows;
      try {
        // Step 2: Read plan
        planRows = await client.query(
          `SELECT OPERATOR_ID, PARENT_OPERATOR_ID, LEVEL, OPERATOR_NAME, OPERATOR_DETAILS,
                  TABLE_NAME, SCHEMA_NAME, TABLE_SIZE, OUTPUT_SIZE, SUBTREE_COST, EXECUTION_ENGINE
           FROM EXPLAIN_PLAN_TABLE WHERE STATEMENT_NAME = '${stmtName}' ORDER BY OPERATOR_ID`
        );
      } finally {
        // Step 3: Cleanup (always runs)
        try {
          await client.query(`DELETE FROM EXPLAIN_PLAN_TABLE WHERE STATEMENT_NAME = '${stmtName}'`);
        } catch (_) {}
      }
      return planRows || [];
    });
  }

  // ─── Database info (existing, kept) ───────────────────────────────────────

  static async testConnection() {
    return connectionManager.testConnection();
  }

  static async getDatabaseInfo() {
    try {
      const version = await this.executeQuery('SELECT * FROM M_DATABASE');
      const user    = await this.executeQuery('SELECT CURRENT_USER, CURRENT_SCHEMA FROM DUMMY');
      return {
        version: version.length > 0 ? version[0] : null,
        currentUser:   user.length > 0 ? user[0].CURRENT_USER   : null,
        currentSchema: user.length > 0 ? user[0].CURRENT_SCHEMA : null
      };
    } catch (error) {
      logger.error('Failed to get database info:', redactSecrets(error.message));
      return { error: redactSecrets(error.message) };
    }
  }

  static async getSchemas() {
    const results = await this.executeQuery(`SELECT SCHEMA_NAME FROM SYS.SCHEMAS ORDER BY SCHEMA_NAME`);
    return results.map(r => r.SCHEMA_NAME);
  }

  static async getTables(schemaName) {
    const results = await this.executeQuery(
      `SELECT TABLE_NAME FROM SYS.TABLES WHERE SCHEMA_NAME = ? ORDER BY TABLE_NAME`,
      [schemaName]
    );
    return results.map(r => r.TABLE_NAME);
  }
}

module.exports = QueryExecutor;
