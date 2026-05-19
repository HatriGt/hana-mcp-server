/**
 * Shared MDC catalog-database resolution for metadata tools.
 * Tool arg `catalog_database` takes precedence over HANA_METADATA_CATALOG_DATABASE env.
 */

const { config } = require('./config');
const Validators = require('./validators');

/**
 * @param {object} args - tool args (may contain catalog_database)
 * @returns {{ catalogDatabase: string|null, error?: string }}
 */
function resolveCatalogDatabase(args) {
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

module.exports = { resolveCatalogDatabase };
