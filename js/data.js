import * as util from './util.js';
import { setRefreshStatus } from './display.js';
import Semaphore from './semaphore.js';

const sem = new Semaphore(30, 30, 15);

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

export async function getLastSold(templateId) {
  const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=3&max_assets=1&template_id=${templateId}&page=1&limit=1&order=desc&sort=updated`;
  const response = await atomicFetch(url, setRefreshStatus);
  const data = await response.json();
  const last = data.data[0];

  // Our simple view model
  const m = {
    assetName: '',
    collectionName: '',
    floorPrice: 0,
    lagHours: 0,
    lastPrice: 0,
    schemaName: '',
    templateId,
  };

  m.collectionName = last.collection_name;
  m.schemaName = last.assets[0].schema.schema_name;
  m.assetName = last.assets[0].name;
  m.lastPrice = util.parseTokenValue(last.price.token_precision, last.price.amount);
  m.lastSoldDate = new Date(Number(last.updated_at_time));

  return m;
}

export async function getFloorListing(templateId) {
  const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales/templates?symbol=WAX&state=1&max_assets=1&template_id=${templateId}&order=asc&sort=price`;
  const response = await atomicFetch(url, setRefreshStatus);

  const data = await response.json();
  const floor = data.data[0];

  if (!floor) {
    return {};
  }

  return {
    floorPrice: util.parseTokenValue(floor.price.token_precision, floor.price.amount),
    mintNumber: floor.assets[0].template_mint,
    templateId,
  };
}

export function transform(data, templateId, wallet) {
  // Our simple view model
  const m = {
    lagHours: 0,
    priceGapPercent: 0,
    historyLink: '',
    listingsLink: '',
    collectionLink: '',
    templateLink: '',
    inventoryLink: '',
    ...data[0],
    ...data[1],
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

export async function getWAXPrice() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=WAX&vs_currencies=USD';
  const response = await fetch(url);
  const data = await response.json();
  return data.wax.usd;
}
