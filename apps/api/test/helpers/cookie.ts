export function readCookiePair(
  setCookieHeader: string | string[] | undefined,
): string {
  if (!setCookieHeader) {
    throw new Error('Missing set-cookie header');
  }

  const raw = Array.isArray(setCookieHeader)
    ? setCookieHeader[0]
    : setCookieHeader;
  const pair = raw?.split(';')[0];

  if (!pair) {
    throw new Error('Invalid set-cookie header');
  }

  return pair;
}
