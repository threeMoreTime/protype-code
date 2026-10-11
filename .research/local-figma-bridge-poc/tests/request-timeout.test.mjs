import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configuredDesignTimeout, designRequestTimeout, DESIGN_CLIENT_TIMEOUT_MARGIN_MS } from '../design/request-timeout.mjs';
import { createMcpServer } from '../mcp/server.mjs';
import { readSessionConfig } from '../scripts/workflow.mjs';

test('design transport budget remains bounded and opt-in', async () => {
  assert.equal(designRequestTimeout(), 40_000);
  assert.equal(configuredDesignTimeout(undefined), 40_000);
  assert.equal(configuredDesignTimeout('120000'), 120_000);
  assert.equal(designRequestTimeout(180_000) + DESIGN_CLIENT_TIMEOUT_MARGIN_MS, 185_000);
  for (const raw of ['', 'Infinity', '-1', '4e4', '0x9c40', '40000.5', ' 40000', '39999', '180001']) {
    assert.throws(() => configuredDesignTimeout(raw), /DESIGN_TIMEOUT_INVALID/);
  }
  for (const value of [null, '40000', 39999, 180001, Infinity, 40000.5]) {
    assert.throws(() => designRequestTimeout(value), /DESIGN_TIMEOUT_INVALID/);
    assert.throws(() => readSessionConfig({ fileIdentity: 'figma-file:demo', designTimeoutMs: value }, process.cwd()), /DESIGN_TIMEOUT_INVALID/);
  }
  assert.equal(readSessionConfig({ fileIdentity: 'figma-file:demo' }, process.cwd()).designTimeoutMs, 40_000);
  assert.equal(readSessionConfig({ fileIdentity: 'figma-file:demo', designTimeoutMs: 120_000 }, process.cwd()).designTimeoutMs, 120_000);
  // Reject an invalid programmatic server budget before opening a listener.
  await assert.rejects(createMcpServer({ port: 0, designTimeoutMs: 0 }), /DESIGN_TIMEOUT_INVALID/);
});
