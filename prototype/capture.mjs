#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { captureDOM } from '../.research/local-figma-bridge-poc/capture/dom-capture.mjs';

// Run against an application the user has already started. This script does not
// execute repository package scripts and never attaches to a signed-in browser.
export async function captureURL({ url, pageId, stateId = 'default', width = 1280, height = 800 }) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.username || target.password || target.search || target.hash) throw new Error('Capture requires a loopback URL without credentials, query or fragment');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(pageId ?? '') || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(stateId)) throw new Error('Invalid page or state ID');
  if (![width, height].every(n => Number.isInteger(n) && n >= 280 && n <= 2560)) throw new Error('Invalid capture viewport');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === target.origin && ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
    // WebSockets can bypass HTTP routing; prevent application channels in this read-only capture context.
    await context.routeWebSocket(/.*/, socket => socket.close());
    const page = await context.newPage();
    await page.goto(target.href, { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    const capture = await page.evaluate(captureDOM, { id: 'runtime', name: pageId, includeInputValues: false });
    const elementMap = {}, pending = [capture.root];
    while (pending.length) {
      const node = pending.pop(), id = node.attrs?.prototypeId;
      if (id) { if (Object.hasOwn(elementMap, id)) throw new Error(`Duplicate data-prototype-id ${id}`); elementMap[id] = node.id; }
      pending.push(...node.children ?? []);
    }
    return { snapshots: [{ pageId, stateId, capture, elementMap }] };
  } finally { await browser.close(); }
}
async function main() {
  const { values } = parseArgs({ options: { url: { type: 'string' }, out: { type: 'string' }, page: { type: 'string' }, state: { type: 'string' }, width: { type: 'string' }, height: { type: 'string' } } });
  if (!values.out) throw new Error('--out is required');
  const result = await captureURL({ url: values.url, pageId: values.page, stateId: values.state, ...(values.width ? { width: Number(values.width) } : {}), ...(values.height ? { height: Number(values.height) } : {}) });
  await mkdir(path.dirname(path.resolve(values.out)), { recursive: true }); await writeFile(values.out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(`Captured ${values.page}; map semantic controls in elementMap before attaching.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
