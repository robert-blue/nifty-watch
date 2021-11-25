import * as util from './util.js';
import Semaphore from './semaphore.js';

const sem = new Semaphore(30, 30, 15);

/**
 * @param {string} url
 * @param {Function} status
 * @returns {Promise<Response>}
 */
async function atomicFetch(url, status) {
  await sem.wait();
  let response = await fetch(url);

  while (response.status === 429) {
    status('AtomicHub rate limit reached. Pausing updates.');
    await util.sleep(5 * 1000);
    response = await fetch(url);
    status();
  }

  await sem.release();
  return response;
}

/**
 * Get latest USD value of WAXP
 * @returns {Promise<number>}
 */
export async function getWAXPrice() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=WAX&vs_currencies=USD';
  const response = await fetch(url);
  const data = await response.json();
  return Number(data.wax.usd);
}

/**
 * @param {string} templateId
 * @param {Function} status
 * @returns {Promise<AtomicSale>}
 */
export async function getLastSold(templateId, status) {
  const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=3&max_assets=1&template_id=${templateId}&page=1&limit=1&order=desc&sort=updated`;
  const response = await atomicFetch(url, status);
  const data = await response.json();
  const last = data.data[0];

  return {
    assetName: last.assets[0].name,
    collectionName: last.collection_name,
    lastPrice: util.parseTokenValue(last.price.token_precision, last.price.amount),
    lastSoldDate: new Date(Number(last.updated_at_time)),
    schemaName: last.assets[0].schema.schema_name,
  };
}

/**
 * @param {string} templateId
 * @param {Function} status
 * @returns {Promise<AtomicListing>}
 */
export async function getFloorListing(templateId, status) {
  const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales/templates?symbol=WAX&state=1&max_assets=1&template_id=${templateId}&order=asc&sort=price`;
  const response = await atomicFetch(url, status);

  const data = await response.json();
  const floor = data.data[0];

  /** @type {AtomicListing} */
  const m = {
    floorPrice: 0,
    mintNumber: 0,
  };

  if (!floor) {
    return m;
  }

  return {
    floorPrice: util.parseTokenValue(floor.price.token_precision, floor.price.amount),
    mintNumber: floor.assets[0].template_mint,
  };
}

/**
 * @param {AtomicSale} lastSold
 * @param {AtomicListing} floor
 * @param {string} templateId
 * @param {string} wallet
 * @returns {AtomicModel}
 */
export function transform(lastSold, floor, templateId, wallet) {
  /** @type {AtomicModel} */
  const m = {
    lagHours: new Date(),
    priceGapPercent: 0,
    historyLink: '',
    listingsLink: '',
    collectionLink: '',
    templateLink: '',
    inventoryLink: '',
    templateId,
    ...lastSold,
    ...floor,
  };

  m.lagHours = (Date.now() - m.lastSoldDate) / 1000 / 60 / 60;
  m.priceGapPercent = ((m.floorPrice - m.lastPrice) / m.lastPrice) * 100;

  m.historyLink = `https://wax.atomichub.io/market/history?collection_name=${m.collectionName}&data:text.name=${m.assetName}&order=desc&schema_name=${m.schemaName}&sort=updated&symbol=WAX`;
  m.listingsLink = `https://wax.atomichub.io/market?collection_name=${m.collectionName}&data:text.name=${m.assetName}&order=asc&schema_name=${m.schemaName}&sort=price&symbol=WAX`;
  m.collectionLink = `https://wax.atomichub.io/explorer/collection/${m.collectionName}`;
  m.templateLink = `https://wax.atomichub.io/explorer/template/${m.collectionName}/${templateId}`;
  m.inventoryLink = `https://wax.atomichub.io/profile/${wallet}?collection_name=${m.collectionName}&match=${m.assetName}&order=desc&sort=transferred`;

  return m;
}

/**
 * Recent sale data from AtomicHub
 * @typedef {Object} AtomicSale
 * @property {string} assetName
 * @property {string} collectionName
 * @property {number} lastPrice
 * @property {Date} lastSoldDate
 * @property {string} schemaName
 */

/** Asset listed for sale on AtomicHub
 * @typedef {Object} AtomicListing
 * @property {number} floorPrice
 * @property {number} mintNumber
 */

/**
 * Composite model of asset data retrieved from AtomicHub.io
 * @typedef {AtomicListing|AtomicSale} AtomicModel
 * @property {number} lagHours
 * @property {string} templateLink
 * @property {number} priceGapPercent
 * @property {string} inventoryLink
 * @property {string} historyLink
 * @property {string} listingsLink
 * @property {string} collectionLink
 * @property {string} templateId
 */
