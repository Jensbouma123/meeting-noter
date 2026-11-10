import SessionShell from './SessionShell';

// The hosted (static export) build prerenders one placeholder page and reads
// the real id from `?id=`; see `sessionPath` in `src/lib/site.ts`. Local
// builds render this route on demand, so nothing is enumerated for them.
export const generateStaticParams =
  process.env.NEXT_PUBLIC_HOSTED === '1' ? () => [{ sessionId: '_' }] : undefined;

export default function SessionPage() {
  return <SessionShell />;
}
