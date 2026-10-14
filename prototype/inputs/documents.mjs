import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { DOMParser, parseHTML } from 'linkedom';
import { readZip } from '../../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { parsePRD } from './prd.mjs';
import { digest, validatePrototype } from '../core/model.mjs';

function htmlText(text) {
  const { document } = parseHTML(text);
  for (const node of document.querySelectorAll('script,style,template,iframe,object,embed,[hidden],[data-capture-private]')) node.remove();
  const blocks = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,tr')].filter(n => !n.parentElement?.closest('p,li,tr'));
  return blocks.map(n => /^H[1-6]$/.test(n.tagName) ? `${'#'.repeat(Number(n.tagName[1]))} ${n.textContent.trim()}` : n.tagName === 'TR' ? [...n.children].map(c => c.textContent.trim()).join(' | ') : n.textContent.trim()).filter(Boolean).join('\n');
}
function docxText(bytes) {
  const zip = readZip(bytes, { maxEntries: 1000, maxEntryBytes: 4 * 1024 * 1024, maxTotalBytes: 16 * 1024 * 1024 });
  const xml = zip.get('word/document.xml')?.toString('utf8');
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('DOCX requires safe word/document.xml; DTD/entities are not supported');
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  return [...document.getElementsByTagName('w:p')].map(p => {
    const pieces = [...p.getElementsByTagName('w:t')].filter(t => !t.parentElement?.getElementsByTagName('w:vanish').length).map(t => t.textContent);
    const style = p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') ?? '';
    const heading = /^(?:Heading|标题)\s*([1-6])$/i.exec(style);
    return `${heading ? '#'.repeat(Number(heading[1])) + ' ' : ''}${pieces.join('')}`;
  }).filter(Boolean).join('\n');
}
export function documentToText(bytes, extension) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Document exceeds 10 MiB');
  if (extension === '.docx') return docxText(bytes);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (['.html', '.htm'].includes(extension)) return htmlText(text);
  if (['.md', '.txt'].includes(extension)) return text;
  throw new Error('Supported documents: Markdown, UTF-8 text, HTML, DOCX, PrototypeSpec JSON');
}
export async function loadDocument(file, options = {}) {
  const info = await stat(file);
  if (!info.isFile() || info.size > 10 * 1024 * 1024) throw new Error('Input must be a file up to 10 MiB');
  const bytes = await readFile(file), extension = path.extname(file).toLowerCase();
  if (extension === '.json') return validatePrototype(JSON.parse(bytes.toString('utf8')));
  const model = parsePRD(documentToText(bytes, extension), { ...options, file: path.basename(file) });
  model.sources[0].sha256 = digest(bytes);
  if (['.docx', '.html', '.htm'].includes(extension)) model.diagnostics.push({ code: 'TEXT_EXTRACTION', severity: 'info', message: '来源行号指抽取后的文本行。布局、批注、图片、表格结构和复杂样式需人工核对；不执行嵌入内容。' });
  return validatePrototype(model);
}
