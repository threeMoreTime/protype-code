import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { WORKSPACE_ID, TASK_ID } from '../relay/protocol.mjs';

test('registered DesignSpec tools publish the bounded 500 batch and reject larger calls without a plugin', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'figma-design-batch-schema-'));
  const root = fileURLToPath(new URL('../', import.meta.url));
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, 'mcp/server.mjs')],
    cwd: root, env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '0',
      LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES: 'figma-file:batch-schema-test',
      LOCAL_FIGMA_BRIDGE_DESIGN_TIMEOUT_MS: '40000',
      LOCAL_FIGMA_BRIDGE_PAIRING_STATE_PATH: path.join(directory, 'pairing.json'),
      LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: path.join(directory, 'grants.json'),
      LOCAL_FIGMA_BRIDGE_AUDIT_PATH: path.join(directory, 'audit.jsonl') }, stderr: 'ignore' });
  const client = new Client({ name: 'design-batch-schema-test', version: '0.0.1' });
  t.after(async () => { await client.close(); await rm(directory, { recursive: true, force: true }); });
  await client.connect(transport);
  const allTools = (await client.listTools()).tools.filter(tool => tool.name.startsWith('figma_scope_design_'));
  const resourceNames = ['figma_scope_design_assets_plan', 'figma_scope_design_asset_stage', 'figma_scope_design_asset_commit'];
  const tools = allTools.filter(tool => !resourceNames.includes(tool.name));
  assert.deepEqual(tools.map(tool => tool.name).sort(), [
    'figma_scope_design_plan', 'figma_scope_design_apply', 'figma_scope_design_audit',
    'figma_scope_design_export_png',
  ].sort());
  for (const tool of tools) {
    assert.equal(tool.inputSchema.properties.batchSize.type, 'integer', tool.name);
    assert.equal(tool.inputSchema.properties.batchSize.minimum, 1, tool.name);
    assert.equal(tool.inputSchema.properties.batchSize.maximum, 500, tool.name);
  }
  const resourceTools = allTools.filter(tool => resourceNames.includes(tool.name));
  assert.deepEqual(resourceTools.map(tool => tool.name).sort(), resourceNames.sort());
  for (const tool of resourceTools) {
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(Object.hasOwn(tool.inputSchema.properties, 'batchSize'), false);
    assert.equal(tool.annotations.readOnlyHint, tool.name.endsWith('assets_plan'));
  }
  const stage = resourceTools.find(tool => tool.name.endsWith('asset_stage'));
  assert.equal(stage.inputSchema.properties.dataBase64.maxLength, Math.ceil(1024 * 1024 / 3) * 4);
  assert.equal(stage.inputSchema.properties.offset.maximum, 20 * 1024 * 1024);
  for (const batchSize of [501, 1000]) {
    const result = await client.callTool({ name: 'figma_scope_design_apply', arguments: {
      expectedFileIdentity: 'figma-file:batch-schema-test', workspaceId: WORKSPACE_ID, taskId: TASK_ID,
      runId: 'batch-schema-test', batchSize, spec: { schemaVersion: '1.0', id: 'batch-schema-test', name: 'Batch schema',
        nodes: [{ key: 'frame', type: 'FRAME', parentKey: null, x: 0, y: 0, width: 10, height: 10, props: {} }] },
    } });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /less than or equal to 500/);
  }
});
