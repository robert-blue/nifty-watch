import {
  KEY_COLUMN_OPTIONS, KEY_TEMPLATE_IDS, KEY_WALLET, LEGACY_KEY_TEMPLATE_IDS,
} from './config.js';
import {
  get, getString, remove, set, setString,
} from './storage.js';
// eslint-disable-next-line import/named
import { CacheData } from './types.js';

interface Preset {
  id: number
  name: string
}

export function getPresets(): Preset[] {
  const defaultValues: Preset[] = [];
  for (let i = 0; i < 9; i++) {
    const ids = getTemplateIds(i);
    // Set preset name
    const counts: {[key: string]: number} = {};
    for (let i1 = 0; i1 < ids.length; i1++) {
      const id = ids[i1];
      const data = get<CacheData>(id.toString());
      if (data) {
        const asset = data.lastSold || data.floorListing;
        const collection = asset.collectionName || '';
        counts[collection] = (counts[collection] || 0) + 1;
      }
    }

    let ordered = [...new Set(Object.keys(counts))];
    ordered = ordered.sort((a, b) => counts[b] - counts[a]);
    console.log('ordered', ordered);

    const preset = {
      id: i,
      name: `Preset ${i + 1} - (${ids.length}) ${ordered.slice(0, 5).join(', ')}`,
    };

    defaultValues.push(preset);
  }

  return get<Preset[]>('presets') || defaultValues;
}

function getKey(presetNumber: number, key: string) {
  return `${presetNumber}:${key}`;
}

export function getQueryStringTemplateIds() : number[] {
  const queryString = new URLSearchParams(document.location.search).get('template_ids');
  console.log('qs', queryString);
  return deserializeTemplateIds(queryString || undefined) || [];
}

export function getTemplateIds(presetNumber: number): number[] {
  // QueryString, if present, has precedence over local storage
  if (presetNumber < 0) {
    const queryStringTemplateIds = getQueryStringTemplateIds();
    if (queryStringTemplateIds.length > 0) {
      return queryStringTemplateIds;
    }
  }

  const templateIds = get<number[]>(getKey(presetNumber, KEY_TEMPLATE_IDS));
  if (templateIds) {
    return templateIds.filter((t) => Number.isInteger(t));
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
export function setTemplateIds(presetNumber: number, val: number[]|string): number[] {
  const ids: number[] = typeof val === 'string' ? deserializeTemplateIds(val) : val;

  // Don't persist values if they come from the QueryString which will be -1
  if (presetNumber >= 0) {
    set<number[]>(getKey(presetNumber, KEY_TEMPLATE_IDS), ids);
  }
  // // Set preset name
  // const counts: {[key: string]: number} = {};
  // for (const id of ids) {
  //   const data = get<CacheData>(id.toString());
  //   if (data) {
  //     const asset = data.lastSold || data.floorListing;
  //     const collection = asset.collectionName || '';
  //     counts[collection] = (counts[collection] || 0) + 1;
  //   }
  // }
  //
  // let ordered = [...new Set(Object.keys(counts))];
  // ordered = ordered.sort((a, b) => counts[b] - counts[a]);
  // console.log('ordered', ordered);

  return ids;
}

export function getWallet(): string {
  return (getString(KEY_WALLET) || '').toLowerCase();
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

// Cleanup
(() => {
  remove('0.columnOptions');
})();
