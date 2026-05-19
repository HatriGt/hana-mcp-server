/**
 * Audit logger for hana_execute_query calls.
 * Appends one JSON line per call to HANA_AUDIT_LOG_FILE when HANA_AUDIT_ENABLED=true.
 * Failures here never propagate to callers.
 */

const fs = require('fs');

/**
 * @typedef {object} AuditEntry
 * @property {string}      tool         - always 'hana_execute_query'
 * @property {string}      queryPreview - first 200 chars of SQL
 * @property {number}      durationMs
 * @property {number|null} rowCount     - null on error
 * @property {boolean}     error
 * @property {number|null} [sqlCode]    - HANA SQLCODE on error
 * @property {string|null} [sqlState]   - SQL state on error
 */

/**
 * Write one audit entry. Reads config at call time so tests can override env after import.
 * @param {AuditEntry} entry
 */
function writeAuditEntry(entry) {
  let enabled = false;
  let logFile = './hana-audit.log';
  try {
    const { config } = require('./config');
    const a = config.getAuditConfig();
    enabled = a.enabled;
    logFile = a.logFile;
  } catch (_) {
    return;
  }

  if (!enabled) return;

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry
  });

  fs.appendFile(logFile, line + '\n', { encoding: 'utf8' }, (err) => {
    if (err) {
      console.error(`[HANA Audit] Failed to write audit entry: ${err.message}`);
    }
  });
}

module.exports = { writeAuditEntry };
