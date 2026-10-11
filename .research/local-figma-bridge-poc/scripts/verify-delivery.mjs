#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyDelivery, writeDelivery } from '../delivery/verify.mjs';

const args = process.argv.slice(2);
if (args.length !== 3 || args[1] !== '--out') {
  console.error('Usage: node scripts/verify-delivery.mjs <manifest.json> --out <empty-output-directory>');
  process.exitCode = 1;
} else {
  try {
    const manifestPath = path.resolve(args[0]);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const result = await verifyDelivery(manifest, { baseDirectory: path.dirname(manifestPath) });
    const delivery = await writeDelivery(result, args[2]);
    console.log(JSON.stringify({ ...delivery, checks: result.report.checks.map(({ name, status, reason }) => ({ name, status, ...(reason ? { reason } : {}) })) }, null, 2));
    process.exitCode = result.report.status === 'PASS' ? 0 : result.report.status === 'NOT_RUN' ? 2 : 1;
  } catch (error) {
    console.error(JSON.stringify({ status: 'FAIL', error: error.message }));
    process.exitCode = 1;
  }
}
