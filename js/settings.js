import { KEY_COLUMN_OPTIONS, KEY_TEMPLATE_IDS, KEY_WALLET, LEGACY_KEY_TEMPLATE_IDS, } from './config.js';
import { get, getString, remove, set, setString, } from './storage.js';
export function getPresets() {
    const defaultValues = [];
    for (let i = 0; i < 9; i++) {
        const ids = getTemplateIds(i);
        // Set preset name
        const counts = {};
        for (let i1 = 0; i1 < ids.length; i1++) {
            const id = ids[i1];
            const data = get(id.toString());
            if (data) {
                const asset = data.lastSold || data.floorListing;
                const collection = asset.collectionName || '';
                counts[collection] = (counts[collection] || 0) + 1;
            }
        }
        let ordered = [...new Set(Object.keys(counts))];
        ordered = ordered.sort((a, b) => counts[b] - counts[a]);
        const preset = {
            id: i,
            name: `Preset ${i + 1} - (${ids.length}) ${ordered.slice(0, 5).join(', ')}`,
        };
        defaultValues.push(preset);
    }
    return get('presets') || defaultValues;
}
function getKey(presetNumber, key) {
    return `${presetNumber}:${key}`;
}
export function getQueryStringTemplateIds() {
    const queryString = new URLSearchParams(document.location.search).get('template_ids');
    console.log('qs', queryString);
    return deserializeTemplateIds(queryString || undefined) || [];
}
export function getTemplateIds(presetNumber) {
    // QueryString, if present, has precedence over local storage
    if (presetNumber < 0) {
        const queryStringTemplateIds = getQueryStringTemplateIds();
        if (queryStringTemplateIds.length > 0) {
            return queryStringTemplateIds;
        }
    }
    const templateIds = get(getKey(presetNumber, KEY_TEMPLATE_IDS));
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
export function setTemplateIds(presetNumber, val) {
    const ids = typeof val === 'string' ? deserializeTemplateIds(val) : val;
    // Don't persist values if they come from the QueryString which will be -1
    if (presetNumber !== -1) {
        set(getKey(presetNumber, KEY_TEMPLATE_IDS), ids);
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
export function getWallets() {
    return (getString(KEY_WALLET) || '')
        .toLowerCase()
        .split(',')
        .map((s) => s.trim());
}
export function getWallet() {
    const wallets = getWallets();
    return (wallets) ? wallets[0] : '';
}
export function setWallet(address) {
    return setString(KEY_WALLET, address);
}
function deserializeTemplateIds(str) {
    console.log('deserialize', str);
    return (str || '')
        .split(',')
        .map((x) => Number(x)).filter((x) => x !== null && !Number.isNaN(x) && x > 0)
        .sort();
}
export function setColumnOptions(presetNumber, options) {
    return set(`${presetNumber}:${KEY_COLUMN_OPTIONS}`, options);
}
export function getColumnOptions(presetNumber) {
    const options = get(`${presetNumber}:${KEY_COLUMN_OPTIONS}`);
    if (options === undefined) {
        return { enabled: [] };
    }
    return options;
}
// Cleanup
(() => {
    remove('0.columnOptions');
})();
//# sourceMappingURL=settings.js.map