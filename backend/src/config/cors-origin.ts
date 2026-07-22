export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
  nodeEnv: string,
): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  if (nodeEnv !== 'development') return false;

  try {
    const parsed = new URL(origin);
    return (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      Boolean(parsed.port)
    );
  } catch {
    return false;
  }
}
