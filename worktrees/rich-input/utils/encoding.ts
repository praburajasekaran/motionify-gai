/**
 * Unicode-safe Base64 encoding/decoding.
 * Standard btoa/atob only handles Latin1. These wrappers
 * handle full Unicode via the encodeURIComponent bridge.
 */

export function encodeBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );
}

export function decodeBase64(str: string): string {
  return decodeURIComponent(
    atob(str)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}
