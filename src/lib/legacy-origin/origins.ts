import { APP_PORT, LEGACY_PORT } from '@/lib/lifecycle/constants';

const HOSTS = ['127.0.0.1', 'localhost'] as const;

export const legacyOrigins = (port: number = LEGACY_PORT): string[] => HOSTS.map((h) => `http://${h}:${port}`);

export const appOrigins = (port: number = APP_PORT): string[] => HOSTS.map((h) => `http://${h}:${port}`);

export const isLocalHostname = (hostname: string): boolean => (HOSTS as readonly string[]).includes(hostname);
