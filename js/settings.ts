import {
  KEY_COLUMN_OPTIONS, KEY_TEMPLATE_IDS, KEY_WALLET, REFRESH_INTERVAL,
} from './config.js';
import { get, set } from './storage.js';

export function getTemplateIds() {
  // QueryString, if present, has precedence over local storage
  const templateIds = new URLSearchParams(document.location.search).get('template_ids');
  if (templateIds) {
    return deserializeTemplateIds(templateIds);
  }

  return deserializeTemplateIds(get(KEY_TEMPLATE_IDS));
}

// Stores template IDs. Accepts an array or comma-delimited string.
export function setTemplateIds(val: string[]|string) {
  const idString = typeof val === 'string' ? val : serializeTemplateIds(val);
  set(KEY_TEMPLATE_IDS, idString);
  return deserializeTemplateIds(idString);
}

export function getWallet(): string {
  return get(KEY_WALLET) || '';
}

export function setWallet(address: string): void {
  return set(KEY_WALLET, address);
}

function serializeTemplateIds(array: string[]) {
  return array.join(',');
}

function deserializeTemplateIds(str?: string) {
  return (str || '').split(',').map((x: string) => x).filter((x: string) => x !== '').sort();
}

export function getRefreshInterval() {
  const urlParams = new URLSearchParams(document.location.search);
  const interval = Number(urlParams.get('refresh_interval'));
  if (interval) {
    return interval * 1000;
  }

  return REFRESH_INTERVAL;
}

interface ColumnOptions {
  enabled: string[]
}

export function setColumnOptions(options: ColumnOptions): void {
  return set(KEY_COLUMN_OPTIONS, JSON.stringify(options));
}

export function getColumnOptions(): ColumnOptions {
  const options = get(KEY_COLUMN_OPTIONS);
  if (options === undefined) {
    return { enabled: [] };
  }

  return JSON.parse(options) as ColumnOptions;
}
