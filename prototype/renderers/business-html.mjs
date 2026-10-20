import { createHash } from 'node:crypto';
import { createBusinessRuntime } from '../business/runtime.mjs';
import { startBusinessSuite } from '../business/browser.mjs';
import { businessStyles } from '../business/styles.mjs';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function renderBusinessHTML(bundle, options = {}) {
  if (!bundle?.catalog?.apps?.length || !bundle.seed || !bundle.locales?.length || !bundle.messages) {
    throw new Error('BUSINESS_HTML_INPUT_INVALID');
  }
  const locale = options.locale ?? bundle.locales[0].id;
  if (!bundle.locales.some(item => item.id === locale)) throw new Error('BUSINESS_LOCALE_INVALID');
  const app = options.app ?? bundle.catalog.apps[0].id;
  if (!bundle.catalog.apps.some(item => item.id === app)) throw new Error('BUSINESS_APP_INVALID');
  const payload = JSON.stringify({ ...bundle, initial: { locale, app, device: options.device ?? 'auto' } }).replace(/</g, '\\u003c');
  const script = `(${startBusinessSuite.toString()})(JSON.parse(document.getElementById('business-data').textContent),${createBusinessRuntime.toString()});`.replace(/\r\n?/g, '\n');
  const hash = createHash('sha256').update(script).digest('base64');
  const css = businessStyles.replace(/\r\n?/g, '\n');
  const styleHash = createHash('sha256').update(css).digest('base64');
  const policy = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'sha256-${styleHash}'; img-src data: blob:; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html lang="${escape(locale.replace('_', '-'))}" dir="${bundle.locales.find(item => item.id === locale).dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="${escape(policy)}"><title>${escape(bundle.messages[locale][bundle.catalog.apps.find(item => item.id === app).nameKey] ?? app)}</title><style>${css}</style></head><body><div id="business-app"></div><script id="business-data" type="application/json">${payload}</script><script>${script}</script></body></html>`;
}
