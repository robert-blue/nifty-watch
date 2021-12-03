import { KEY_COLUMN_OPTIONS, KEY_TEMPLATE_IDS, KEY_WALLET, REFRESH_INTERVAL, } from './config.js';
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
export function setTemplateIds(val) {
    const idString = typeof val === 'string' ? val : serializeTemplateIds(val);
    set(KEY_TEMPLATE_IDS, idString);
    return deserializeTemplateIds(idString);
}
export function getWallet() {
    return get(KEY_WALLET) || '';
}
export function setWallet(address) {
    return set(KEY_WALLET, address);
}
function serializeTemplateIds(array) {
    return array.join(',');
}
function deserializeTemplateIds(str) {
    return (str || '').split(',').map((x) => x).filter((x) => x !== '').sort();
}
export function getRefreshInterval() {
    const urlParams = new URLSearchParams(document.location.search);
    const interval = Number(urlParams.get('refresh_interval'));
    if (interval) {
        return interval * 1000;
    }
    return REFRESH_INTERVAL;
}
export function setColumnOptions(options) {
    return set(KEY_COLUMN_OPTIONS, JSON.stringify(options));
}
export function getColumnOptions() {
    const options = get(KEY_COLUMN_OPTIONS);
    if (options === undefined) {
        return { enabled: [] };
    }
    return JSON.parse(options);
}
//# sourceMappingURL=settings.js.map