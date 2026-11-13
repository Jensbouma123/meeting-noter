let lastSent = '';

export function reportActiveMeeting(meetingId: string | null, isLive: boolean): void {
  const key = `${meetingId ?? ''}|${isLive}`;
  if (key === lastSent) return;
  lastSent = key;
  fetch('/api/active-meeting', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ meetingId, isLive }),
  }).catch(() => {
    lastSent = '';
  });
}
