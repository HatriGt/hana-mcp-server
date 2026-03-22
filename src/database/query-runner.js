/**
 * User-facing query execution with row/column/cell limits and optional SELECT wrapping.
 * Internal metadata queries should use QueryExecutor.executeQuery directly.
 */

const QueryExecutor = require('./query-executor');
const { config } = require('../utils/config');

const SUB_ALIAS = '"_HANA_MCP_SUB"';

/**
 * @param {string} sql
 * @returns {boolean}
 */
function isSingleSelectableStatement(sql) {
  if (!sql || typeof sql !== 'string') return false;
  const t = sql.trim().replace(/;+\s*$/u, '').trim();
  if (!t) return false;
  if (/;/u.test(t)) return false;
  const upper = t.toUpperCase();
  return upper.startsWith('SELECT') || upper.startsWith('WITH');
}

/**
 * @param {object} row
 * @param {string[]} columnKeys
 * @param {number} maxCellChars
 * @returns {object}
 */
function trimRow(row, columnKeys, maxCellChars) {
  const out = {};
  for (const key of columnKeys) {
    let v = row[key];
    if (v === null || v === undefined) {
      out[key] = v;
      continue;
    }
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (s.length > maxCellChars) {
      s = `${s.slice(0, maxCellChars)}…`;
    }
    out[key] = s;
  }
  return out;
}

/**
 * @param {object[]} rows
 * @param {number} maxCols
 * @param {number} maxCellChars
 * @param {number} maxDataRows rows to keep after truncation detection (excluding +1 probe row)
 * @returns {{ columns: string[], dataRows: object[], truncated: boolean }}
 */
function shapeRows(rows, maxCols, maxCellChars, maxDataRows) {
  if (!rows || rows.length === 0) {
    return { columns: [], dataRows: [], truncated: false, columnsOmitted: 0 };
  }
  const allKeys = Object.keys(rows[0]);
  const truncatedByFetch = rows.length > maxDataRows;
  const sliceRows = truncatedByFetch ? rows.slice(0, maxDataRows) : rows;
  const columns = allKeys.slice(0, maxCols);
  const columnTruncated = allKeys.length > maxCols;
  const dataRows = sliceRows.map((row) => trimRow(row, columns, maxCellChars));
  return {
    columns,
    dataRows,
    truncated: truncatedByFetch || columnTruncated,
    columnsOmitted: columnTruncated ? Math.max(0, allKeys.length - maxCols) : 0
  };
}

/**
 * @param {string} query
 * @param {Array} parameters
 * @param {{
 *   limit?: number,
 *   offset?: number,
 *   maxRows?: number,
 *   includeTotal?: boolean
 * }} args
 * @returns {Promise<object>}
 */
async function executeUserQuery(query, parameters = [], args = {}) {
  const limits = config.getQueryLimits();
  const maxRowsCap = limits.maxResultRows;
  const requestedMax = args.maxRows != null ? Number(args.maxRows) : maxRowsCap;
  const effectiveMax = Math.min(
    Number.isFinite(requestedMax) ? Math.max(1, requestedMax) : maxRowsCap,
    maxRowsCap
  );
  const offset =
    args.offset != null
      ? Math.max(0, Number(args.offset) || 0)
      : limits.defaultOffset;
  const fetchLimit = effectiveMax + 1;

  const maxCols = limits.maxResultCols;
  const maxCellChars = limits.maxCellChars;

  if (isSingleSelectableStatement(query)) {
    const inner = query.trim().replace(/;+\s*$/u, '').trim();
    const wrapped = `SELECT * FROM (${inner}) AS ${SUB_ALIAS} LIMIT ? OFFSET ?`;
    const params = [...(parameters || []), fetchLimit, offset];

    let totalRows = null;
    if (args.includeTotal === true) {
      const countSql = `SELECT COUNT(*) AS "_HANA_MCP_CNT" FROM (${inner}) AS ${SUB_ALIAS}`;
      try {
        const cnt = await QueryExecutor.executeScalarQuery(countSql, parameters || []);
        totalRows = cnt != null ? Number(cnt) : null;
      } catch (e) {
        totalRows = null;
      }
    }

    const rawRows = await QueryExecutor.executeQuery(wrapped, params);
    const shaped = shapeRows(rawRows, maxCols, maxCellChars, effectiveMax);
    const truncated = shaped.truncated;
    const nextOffset = truncated ? offset + shaped.dataRows.length : null;

    return {
      kind: 'select',
      columns: shaped.columns,
      rows: shaped.dataRows,
      truncated,
      returnedRows: shaped.dataRows.length,
      maxRows: effectiveMax,
      offset,
      nextOffset,
      totalRows,
      columnsOmitted: shaped.columnsOmitted || 0,
      appliedWrap: true
    };
  }

  let rawRows = await QueryExecutor.executeQuery(query, parameters || []);
  if (rawRows.length > fetchLimit) {
    rawRows = rawRows.slice(0, fetchLimit);
  }
  const shaped = shapeRows(rawRows, maxCols, maxCellChars, effectiveMax);
  const truncated = shaped.truncated;
  const nextOffset = truncated ? offset + shaped.dataRows.length : null;

  return {
    kind: 'other',
    columns: shaped.columns,
    rows: shaped.dataRows,
    truncated,
    returnedRows: shaped.dataRows.length,
    maxRows: effectiveMax,
    offset,
    nextOffset,
    totalRows: null,
    columnsOmitted: shaped.columnsOmitted || 0,
    appliedWrap: false
  };
}

module.exports = {
  executeUserQuery,
  isSingleSelectableStatement,
  shapeRows,
  trimRow
};
