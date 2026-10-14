import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { DOMParser, parseHTML } from 'linkedom';
import { readZip } from '../../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { parsePRD } from './prd.mjs';
import { digest, validatePrototype } from '../core/model.mjs';

function htmlText(text) {
  const { document } = parseHTML(text);
  for (const node of document.querySelectorAll('head,script,style,template,iframe,object,embed,[hidden],[data-capture-private]')) node.remove();
  const blocks = new Set(['HTML', 'BODY', 'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DETAILS', 'DIALOG', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'HEADER', 'HGROUP', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY', 'TABLE', 'TBODY', 'TFOOT', 'THEAD', 'UL']);
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const lines = [], pending = [document]; let inline = '';
  const flush = () => { const value = normalize(inline); if (value) lines.push(value); inline = ''; };
  // Walk every text node once, including text outside the familiar paragraph
  // tags. Container boundaries become lines without duplicating nested text.
  while (pending.length) {
    const node = pending.pop();
    if (node === null) { flush(); continue; }
    if (node.nodeType === 3) { inline += node.textContent; continue; }
    if (![1, 9, 11].includes(node.nodeType)) continue;
    const tag = node.tagName;
    if (tag === 'BR') { flush(); continue; }
    if (/^H[1-6]$/.test(tag)) {
      flush(); const value = normalize(node.textContent);
      if (value) lines.push(`${'#'.repeat(Number(tag[1]))} ${value}`);
      continue;
    }
    if (tag === 'TR') {
      flush(); const cells = [...node.children].filter(c => ['TD', 'TH'].includes(c.tagName));
      const value = cells.map(c => normalize(c.textContent)).join(' | ');
      if (value) lines.push(value);
      continue;
    }
    if (blocks.has(tag)) { flush(); pending.push(null); }
    const children = [...node.childNodes];
    for (let i = children.length - 1; i >= 0; i--) pending.push(children[i]);
  }
  flush(); return lines.join('\n');
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
