import { businessCatalog } from '../../examples/business-suite/catalog.mjs';
import { createBusinessSeed } from '../../examples/business-suite/seed.mjs';
import { SUPPORTED_LOCALES, messages } from './locales.mjs';
import { createBusinessRuntime } from './runtime.mjs';
import { renderBusinessHTML } from '../renderers/business-html.mjs';
import { renderBusinessFigma } from './figma.mjs';

export function buildBusinessArtifacts(options = {}) {
  const catalog = businessCatalog;
  const seed = createBusinessSeed();
  const locale = options.locale || 'zh_cn';
  if (!SUPPORTED_LOCALES.some(item => item.id === locale)) throw new Error('BUSINESS_LOCALE_INVALID');
  if (options.app && !catalog.apps.some(item => item.id === options.app)) throw new Error('BUSINESS_APP_INVALID');
  if (options.device && !['desktop', 'mobile'].includes(options.device)) throw new Error('BUSINESS_DEVICE_INVALID');
  createBusinessRuntime({ catalog, seed });
  const bundle = { catalog, seed, locales: SUPPORTED_LOCALES, messages };
  const json = value => `${JSON.stringify(value, null, 2)}\n`;
  const files = new Map([
    ['index.html', renderBusinessHTML(bundle, { app: options.app, locale, device: options.device })],
    ['demo-data.json', json(seed)],
  ]);
  const locales = options.allDesignLocales ? SUPPORTED_LOCALES.map(item => item.id) : [locale];
  for (const app of catalog.apps.filter(item => !options.app || item.id === options.app)) {
    for (const device of options.device ? [options.device] : ['desktop', 'mobile']) {
      for (const language of locales) files.set(`figma/${app.id}/${device}/${language}/design-spec.json`, `${JSON.stringify(renderBusinessFigma(bundle, { app: app.id, device, locale: language }))}\n`);
    }
  }
  return {
    files,
    counts: { applications: catalog.apps.length, modules: catalog.modules.length, devices: 2,
      locales: SUPPORTED_LOCALES.length, surfaces: catalog.modules.length * 2 * SUPPORTED_LOCALES.length },
    status: { nativeFigma: 'NOT RUN' },
  };
}
