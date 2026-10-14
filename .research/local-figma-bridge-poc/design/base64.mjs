// Constant stack space in both Node and the plugin; repeated-group regexes can
// exhaust V8's stack on otherwise valid multi-megabyte image payloads.
export function isBase64(value) {
  if (typeof value !== 'string' || !value.length || value.length % 4 !== 0) return false;
  const end = value.length - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
  for (let index = 0; index < end; index++) {
    const code = value.charCodeAt(index);
    if (!(code >= 65 && code <= 90 || code >= 97 && code <= 122 || code >= 48 && code <= 57 || code === 43 || code === 47)) return false;
  }
  return true;
}
