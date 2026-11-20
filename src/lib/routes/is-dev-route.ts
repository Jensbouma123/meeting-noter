export const isDevRoute = (pathname: string | null): boolean =>
  pathname !== null && (pathname === '/dev' || pathname.startsWith('/dev/'));
