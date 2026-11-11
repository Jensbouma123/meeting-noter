'use client';

/**
 * Tells the on-demand server this tab is open (see idle-shutdown.ts), so it
 * stops once the last Meeting Noter tab closes but never while one records.
 *
 *   useServerHeartbeat();             // once per tab, near the root
 *   useServerHeartbeat(isRecording);  // where the recording state lives
 *
 * Every mount in a tab shares one client id (sessionStorage, so a reload keeps
 * it) and one timer; the tab counts as recording while any mount passes true.
 */
import { useEffect, useRef } from 'react';

export const HEARTBEAT_URL = '/api/app/heartbeat';
export const HEARTBEAT_INTERVAL_MS = 15_000;
const ID_KEY = 'mn.heartbeatClientId';

const mounts = new Map<object, boolean>();
let timer: ReturnType<typeof setInterval> | null = null;
let fallbackId: string | null = null;

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function clientId(): string {
  try {
    let id = sessionStorage.getItem(ID_KEY);
    if (!id) {
      id = newId();
      sessionStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    fallbackId ??= newId();
    return fallbackId;
  }
}

const recording = () => [...mounts.values()].some(Boolean);
const body = (closing: boolean) =>
  JSON.stringify({ clientId: clientId(), recording: recording(), ...(closing ? { closing: true } : {}) });

function beat(): void {
  void fetch(HEARTBEAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body(false),
    keepalive: true,
  }).catch(() => {});
}

function onPageHide(): void {
  // A string body goes out as text/plain, which a beacon may always send.
  if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(HEARTBEAT_URL, body(true))) return;
  void fetch(HEARTBEAT_URL, { method: 'POST', body: body(true), keepalive: true }).catch(() => {});
}

function onVisibility(): void {
  if (document.visibilityState === 'visible') beat();
}

function start(): void {
  timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', beat);
  document.addEventListener('visibilitychange', onVisibility);
  beat();
}

function stop(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  window.removeEventListener('pagehide', onPageHide);
  window.removeEventListener('pageshow', beat);
  document.removeEventListener('visibilitychange', onVisibility);
}

export function useServerHeartbeat(isRecording?: boolean): void {
  const key = useRef({}).current;

  useEffect(() => {
    if (!mounts.has(key)) mounts.set(key, false);
    if (mounts.size === 1) start();
    return () => {
      const wasRecording = mounts.get(key);
      mounts.delete(key);
      if (mounts.size === 0) stop();
      else if (wasRecording) beat();
    };
  }, [key]);

  useEffect(() => {
    if (isRecording === undefined || !mounts.has(key)) return;
    const next = isRecording === true;
    if (mounts.get(key) === next) return;
    mounts.set(key, next);
    beat();
  }, [key, isRecording]);
}
