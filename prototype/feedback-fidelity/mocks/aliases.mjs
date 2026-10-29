import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Package boundaries are intercepted before the source application's request or
// session initialization can execute. Original business service adapters remain.
export function createSourceMockAliases(sourceRoot) {
  if (!path.isAbsolute(sourceRoot)) throw new TypeError('sourceRoot must be absolute');
  return new Map([
    ['@monorepo/network', path.join(here, 'network.mjs')],
    ['@monorepo/utils', path.join(here, 'utils.mjs')],
    [path.join(sourceRoot, 'src/pages/workOrder/imageAudit/services/index.ts'), path.join(here, 'image-audit-service.mjs')],
  ]);
}
