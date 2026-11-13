import packageInfo from '../../../package.json';

export const UPDATE_REFRESH_MS = 6 * 60 * 60 * 1000;
export const UPDATE_DISMISSED_KEY = 'mn.update.dismissed';
export const UPDATE_URL = '/api/app/update';
export const CURRENT_VERSION = packageInfo.version;
