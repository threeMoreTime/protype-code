import { mockControl, getMockUserInfo, recordMockNavigation } from './runtime.mjs';

export const systemInfo = Object.freeze({
  getUserInfo: getMockUserInfo,
  setUserInfo: (value) => mockControl.setPermissions(value?.permissions ?? []),
  removeUserInfo: () => mockControl.setPermissions([]),
});

export function openTabPage(target, title) {
  recordMockNavigation(typeof target === 'string' ? { path: target, title } : target);
}

// The isolated page only reads this property. There is no source initializer,
// reactive session store, persistence or setter behind this deliberately small shim.
export function useSystemProperty(key) {
  if (key !== 'userInfo') throw new Error('MOCK_PROPERTY_UNSUPPORTED');
  return { value: getMockUserInfo() };
}

export default { systemInfo, openTabPage, useSystemProperty };
