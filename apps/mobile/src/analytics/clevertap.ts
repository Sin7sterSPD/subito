/**
 * CleverTap hooks — wire native SDK after `clevertap-react-native` + prebuild.
 * Safe to call from auth flows; no-ops when native module is absent.
 */

type LoginPayload = { userId: string; phone?: string };

export function cleverTapOnUserLogin(_payload: LoginPayload): void {
  if (__DEV__) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const CleverTap = require('clevertap-react-native');
    CleverTap?.onUserLogin?.({
      Identity: _payload.userId,
      Phone: _payload.phone,
    });
  } catch {
    /* native module not installed */
  }
}

export function cleverTapOnUserLogout(): void {
  if (__DEV__) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const CleverTap = require('clevertap-react-native');
    CleverTap?.profileSet?.({});
    CleverTap?.logout?.();
  } catch {
    /* native module not installed */
  }
}
