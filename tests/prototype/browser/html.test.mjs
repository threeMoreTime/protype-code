import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { parsePRD } from '../../../prototype/inputs/prd.mjs';
import { parseReactProject } from '../../../prototype/inputs/react.mjs';
import { renderHTML } from '../../../prototype/renderers/html.mjs';
import { validatePrototype } from '../../../prototype/core/model.mjs';
import { minimal } from '../fixtures.mjs';

async function withPage(model, viewport, run) {
  const dir = await mkdtemp(path.join(tmpdir(), 'html-prototype-'));
  const browser = await chromium.launch({ headless: true, ...(process.env.PROTOTYPE_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PROTOTYPE_CHROMIUM_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'] } : {}) });
  try {
    const file = path.join(dir, 'index.html'); await writeFile(file, renderHTML(model));
    const page = await browser.newPage({ viewport }), errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('request', req => { if (/^https?:/.test(req.url())) requests.push(req.url()); });
    await page.goto(pathToFileURL(file).href);
    await page.getByRole('heading', { level: 2 }).waitFor();
    await run(page);
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
  } finally { await browser.close(); await rm(dir, { recursive: true, force: true }); }
}

test('admin HTML: required fields block invalid submit, then the declared success transition runs offline', async () => {
  const model = parsePRD(await readFile(new URL('../../../examples/prototypes/admin/requirements.md', import.meta.url), 'utf8'));
  await withPage(model, { width: 1440, height: 1000 }, async page => {
    await page.getByRole('button', { name: '新增成员', exact: true }).click();
    await page.getByRole('heading', { level: 2, name: '编辑成员' }).waitFor();
    await page.getByRole('button', { name: '保存成员', exact: true }).click();
    assert.match(page.url(), /editor\/default$/);
    await page.getByLabel('姓名 *', { exact: true }).fill('演示成员');
    await page.getByLabel('邮箱 *', { exact: true }).fill('demo@example.test');
    await page.getByLabel('职能 *', { exact: true }).selectOption('研发');
    await page.getByRole('button', { name: '保存成员', exact: true }).click();
    await page.getByRole('status').waitFor(); assert.equal(await page.getByRole('status').textContent(), '成员已保存');
    await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/admin.png', fullPage: true });
  });
});

test('mobile HTML: appointment path, success state, return path and responsive viewport', async () => {
  const model = parsePRD(await readFile(new URL('../../../examples/prototypes/mobile/requirements.md', import.meta.url), 'utf8'));
  await withPage(model, { width: 390, height: 844 }, async page => {
    await page.getByRole('button', { name: '预约场地', exact: true }).click();
    await page.getByLabel('联系人 *', { exact: true }).fill('演示联系人');
    await page.getByLabel('预约日期 *', { exact: true }).fill('2026-12-20');
    await page.getByRole('button', { name: '确认预约', exact: true }).click();
    await page.getByRole('status').waitFor(); assert.equal(await page.getByRole('status').textContent(), '预约成功');
    await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
    await page.getByRole('button', { name: '返回首页', exact: true }).click();
    await page.getByRole('heading', { level: 2, name: '选择场地' }).waitFor();
    await page.getByLabel('查看状态', { exact: true }).selectOption('empty');
    await page.getByRole('status').waitFor(); assert.equal(await page.getByRole('status').textContent(), '暂无可用场地');
  });
});

test('React content HTML: extracted links navigate between article and home', async () => {
  const model = await parseReactProject(new URL('../../../examples/prototypes/content', import.meta.url));
  await withPage(model, { width: 1280, height: 900 }, async page => {
    await page.getByRole('button', { name: '阅读市集指南', exact: true }).click();
    await page.getByRole('heading', { level: 2, name: '周末市集指南' }).waitFor();
    await page.getByRole('button', { name: '返回首页', exact: true }).click();
    await page.getByRole('heading', { level: 2, name: '社区故事' }).waitFor();
  });
});

test('malicious labels stay text under CSP, and declared timers transition correctly', async () => {
  const model = validatePrototype(minimal());
  model.pages[0].elements[0].label = '</script><script>window.__pwned=1</script><img src="https://example.test/">';
  model.actions[0].trigger = 'timeout'; model.actions[0].delaySeconds = 0.2;
  await withPage(model, { width: 1000, height: 900 }, async page => {
    await page.getByRole('status').waitFor(); assert.equal(await page.getByRole('status').textContent(), '成功');
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    assert.equal(await page.locator('img').count(), 0);
  });
});
