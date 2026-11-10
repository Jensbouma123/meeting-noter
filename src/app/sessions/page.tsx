import { redirect } from 'next/navigation';

/* No separate meetings list — the sidebar is the session list. */
export default function SessionsIndex() {
  redirect('/');
}
