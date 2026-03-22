#!/usr/bin/env node
/**
 * Config: remaining HANA connection fields, logging env, display helpers, validate(), explicit DB types.
 */

const assert = require('assert');
const { Config } = require('../../src/utils/config');

function withEnv(overrides, fn) {
  const keys = Object.keys(overrides);
  const saved = {};
  for (const k of keys) {
    saved[k] = process.env[k];
    const v = overrides[k];
    if (v === undefined || v === null) delete process.env[k];
    else process.env[k] = String(v);
  }
  try {
    fn(new Config());
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

console.log('config all-env tests\n');

withEnv(
  {
    HANA_HOST: 'h.example',
    HANA_PORT: '30015',
    HANA_USER: 'u',
    HANA_PASSWORD: 'p',
    HANA_SCHEMA: 'SCH',
    HANA_INSTANCE_NUMBER: '00',
    HANA_DATABASE_NAME: 'TEN',
    HANA_CONNECTION_TYPE: 'auto',
    HANA_SSL: 'true',
    HANA_ENCRYPT: 'true',
    HANA_VALIDATE_CERT: 'true',
    LOG_LEVEL: 'DEBUG',
    ENABLE_FILE_LOGGING: 'true',
    ENABLE_CONSOLE_LOGGING: 'false'
  },
  (c) => {
    const h = c.getHanaConfig();
    assert.strictEqual(h.host, 'h.example');
    assert.strictEqual(h.port, 30015);
    assert.strictEqual(h.user, 'u');
    assert.strictEqual(h.password, 'p');
    assert.strictEqual(h.schema, 'SCH');
    assert.strictEqual(h.instanceNumber, '00');
    assert.strictEqual(h.databaseName, 'TEN');
    assert.strictEqual(h.connectionType, 'auto');
    assert.strictEqual(h.ssl, true);
    assert.strictEqual(h.encrypt, true);
    assert.strictEqual(h.validateCert, true);
    const s = c.getServerConfig();
    assert.strictEqual(s.logLevel, 'DEBUG');
    assert.strictEqual(s.enableFileLogging, true);
    assert.strictEqual(s.enableConsoleLogging, false);
  }
);
console.log('  ok: HANA_* + LOG_LEVEL + ENABLE_* logging flags');

withEnv({ HANA_PORT: 'not-a-number' }, (c) => {
  assert.strictEqual(c.getHanaConfig().port, 443);
});
withEnv({ HANA_PORT: '' }, (c) => {
  assert.strictEqual(c.getHanaConfig().port, 443);
});
console.log('  ok: HANA_PORT falls back to 443 when invalid or empty');

withEnv({ HANA_SSL: 'false' }, (c) => {
  assert.strictEqual(c.getHanaConfig().ssl, false);
});
withEnv({ HANA_ENCRYPT: 'false' }, (c) => {
  assert.strictEqual(c.getHanaConfig().encrypt, false);
});
withEnv({ HANA_VALIDATE_CERT: 'false' }, (c) => {
  assert.strictEqual(c.getHanaConfig().validateCert, false);
});
console.log('  ok: HANA_SSL / HANA_ENCRYPT / HANA_VALIDATE_CERT === false');

withEnv(
  {
    HANA_HOST: 'h',
    HANA_PORT: undefined,
    HANA_USER: 'u',
    HANA_PASSWORD: 'p',
    HANA_SCHEMA: 'S',
    HANA_INSTANCE_NUMBER: undefined,
    HANA_DATABASE_NAME: undefined,
    HANA_CONNECTION_TYPE: 'single_container'
  },
  (c) => {
    assert.strictEqual(c.getHanaDatabaseType(), 'single_container');
    const p = c.getConnectionParams();
    assert.strictEqual(p.uid, 'u');
    assert.strictEqual(p.pwd, 'p');
    assert.strictEqual(p.serverNode, 'h:443');
    assert.strictEqual(p.databaseName, undefined);
    assert.strictEqual(c.validate(), true);
  }
);
console.log('  ok: explicit single_container + validate + connection params');

withEnv(
  {
    HANA_HOST: 'h',
    HANA_PORT: '443',
    HANA_USER: 'u',
    HANA_PASSWORD: 'p',
    HANA_INSTANCE_NUMBER: '10',
    HANA_DATABASE_NAME: 'DB1',
    HANA_CONNECTION_TYPE: 'mdc_tenant'
  },
  (c) => {
    assert.strictEqual(c.getHanaDatabaseType(), 'mdc_tenant');
    const p = c.getConnectionParams();
    assert.strictEqual(p.databaseName, 'DB1');
    assert.strictEqual(c.validate(), true);
  }
);
console.log('  ok: explicit mdc_tenant + databaseName on params');

withEnv(
  {
    HANA_HOST: 'h',
    HANA_USER: 'u',
    HANA_PASSWORD: 'p',
    HANA_INSTANCE_NUMBER: '10',
    HANA_CONNECTION_TYPE: 'mdc_system'
  },
  (c) => {
    assert.strictEqual(c.getHanaDatabaseType(), 'mdc_system');
    assert.strictEqual(c.validate(), true);
  }
);
console.log('  ok: explicit mdc_system validates');

withEnv({ HANA_HOST: '', HANA_USER: 'u', HANA_PASSWORD: 'p' }, (c) => {
  assert.strictEqual(c.validate(), false);
});
withEnv({ HANA_HOST: 'h', HANA_USER: '', HANA_PASSWORD: 'p' }, (c) => {
  assert.strictEqual(c.validate(), false);
});
console.log('  ok: validate fails when host or user missing');

withEnv(
  {
    HANA_HOST: 'h',
    HANA_USER: 'u',
    HANA_PASSWORD: 'p',
    HANA_CONNECTION_TYPE: 'auto',
    HANA_INSTANCE_NUMBER: '',
    HANA_DATABASE_NAME: 'T'
  },
  (c) => {
    assert.strictEqual(c.getHanaDatabaseType(), 'single_container');
  }
);
console.log('  ok: auto stays single_container without instance number');

withEnv(
  {
    HANA_HOST: 'h',
    HANA_USER: 'u',
    HANA_PASSWORD: 'p',
    HANA_SCHEMA: 'S'
  },
  (c) => {
    const d = c.getDisplayConfig();
    assert.strictEqual(d.host, 'h');
    assert.strictEqual(d.password, 'SET (hidden)');
    assert.strictEqual(d.schema, 'S');
    const e = c.getEnvironmentVars();
    assert.strictEqual(e.HANA_PASSWORD, 'SET (hidden)');
    assert.strictEqual(e.HANA_HOST, 'h');
  }
);
console.log('  ok: getDisplayConfig / getEnvironmentVars mask password');

console.log('\nDone.');
