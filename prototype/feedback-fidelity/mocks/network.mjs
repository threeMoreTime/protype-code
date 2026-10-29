import { dispatchMockRequest } from './runtime.mjs';

// This intentionally has no transport, credentials, persistence or real host.
export const network = Object.freeze(Object.fromEntries(
  ['Get', 'Post', 'Put', 'Delete', 'Patch'].map((method) => [
    method,
    (endpoint, payload, options) => dispatchMockRequest(method.toUpperCase(), endpoint, payload, options),
  ]),
));

export default network;
