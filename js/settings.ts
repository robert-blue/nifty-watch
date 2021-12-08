import {
  KEY_COLUMN_OPTIONS, KEY_TEMPLATE_IDS, KEY_WALLET, LEGACY_KEY_TEMPLATE_IDS,
} from './config.js';
import {
  get, getString, remove, set, setString,
} from './storage.js';

interface Preset {
  id: number
  name: string
}

export function getPresets(): Preset[] {
  const defaultValues: Preset[] = [];
  for (let i = 0; i < 9; i++) {
    const preset = {
      id: i,
      name: `Preset ${i + 1}`,
    };

    defaultValues.push(preset);
  }

  return get<Preset[]>('presets') || defaultValues;
}

function getKey(presetNumber: number, key: string) {
  return `${presetNumber}:${key}`;
}

export function getTemplateIds(presetNumber: number): number[] {
  // QueryString, if present, has precedence over local storage
  const queryString = new URLSearchParams(document.location.search).get(LEGACY_KEY_TEMPLATE_IDS);
  if (queryString) {
    return deserializeTemplateIds(queryString);
  }

  const templateIds = get<number[]>(getKey(presetNumber, KEY_TEMPLATE_IDS));
  if (templateIds) {
    return templateIds;
  }

  const legacyIds = deserializeTemplateIds(getString(LEGACY_KEY_TEMPLATE_IDS));
  if (legacyIds && legacyIds.length > 0) {
    setTemplateIds(presetNumber, legacyIds);
    console.debug('Old templateID format found. Deleting.');
    remove(LEGACY_KEY_TEMPLATE_IDS);
    return legacyIds;
  }

  return [];
}

// Stores template IDs. Accepts an array or comma-delimited string.
export function setTemplateIds(presetNumber: number, val: number[]|string) {
  const ids: number[] = typeof val === 'string' ? deserializeTemplateIds(val) : val;
  set<number[]>(getKey(presetNumber, KEY_TEMPLATE_IDS), ids);
  return ids;
}

export function getWallet(): string {
  return getString(KEY_WALLET) || '';
}

export function setWallet(address: string): void {
  return setString(KEY_WALLET, address);
}

function deserializeTemplateIds(str?: string): number[] {
  console.log('deserialize', str);
  return (str || '')
    .split(',')
    .map((x: string) => Number(x)).filter(
      (x) => x !== null && !Number.isNaN(x) && x > 0,
    )
    .sort();
}

interface ColumnOptions {
  enabled: string[]
}

export function setColumnOptions(presetNumber: number, options: ColumnOptions): void {
  return set<ColumnOptions>(`${presetNumber}:${KEY_COLUMN_OPTIONS}`, options);
}

export function getColumnOptions(presetNumber: number): ColumnOptions {
  const options = get<ColumnOptions>(`${presetNumber}:${KEY_COLUMN_OPTIONS}`);
  if (options === undefined) {
    return { enabled: [] };
  }

  return options;
}
