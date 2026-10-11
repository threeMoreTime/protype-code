// Large specifications still perform fresh ownership and user-edit checks on
// every operation. Keep the opt-in transport budget bounded; it is not a retry.
export const DEFAULT_DESIGN_TIMEOUT_MS = 40_000;
export const MAX_DESIGN_TIMEOUT_MS = 180_000;
export const DESIGN_CLIENT_TIMEOUT_MARGIN_MS = 5_000;

export function designRequestTimeout(value = DEFAULT_DESIGN_TIMEOUT_MS) {
  if (!Number.isInteger(value) || value < DEFAULT_DESIGN_TIMEOUT_MS || value > MAX_DESIGN_TIMEOUT_MS) {
    throw new Error('DESIGN_TIMEOUT_INVALID: expected an integer from 40000 to 180000 ms');
  }
  return value;
}

export function configuredDesignTimeout(raw) {
  if (raw === undefined) return DEFAULT_DESIGN_TIMEOUT_MS;
  if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) throw new Error('DESIGN_TIMEOUT_INVALID: invalid environment value');
  return designRequestTimeout(Number(raw));
}
