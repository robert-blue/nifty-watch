import { KEY_TEMPLATE_IDS, KEY_WALLET } from './config.js';
import { get, set } from './storage.js';

export function getTemplateIds() {
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
  return (str || '').split(',').map((x) => Number(x)).sort();
}
