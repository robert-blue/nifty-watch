import {
  BATCH_SIZE, DEAD_HOURS, FRESH_HOURS, HOT_HOURS,
} from './config.js';
import * as settings from './settings.js';
import * as util from './util.js';
import * as data from './data.js';
import { drawTable, setRefreshStatus } from './display.js';
import Semaphore from './semaphore.js';
import { getTemplateRow } from "./util.js";

const sem = new Semaphore(5, 1);


let wallet = '';
let templateIds = [];

let exchangeTable;
let refreshTableButton;
let setTemplateIDsButton;
let setWalletButton;
let shareButton;

function refreshTableSort() {
  const table = document.querySelector('#main-table');
  if (table && table.refreshSort !== undefined) {
    table.refreshSort();
  }
}

async function updateRow(templateId, waxPrice) {
  await sem.wait();
  const row = util.getTemplateRow(templateId);
  row.classList.add('updating');

  const results = await Promise.all([
    await data.getLastSold(templateId),
    await data.getFloorListing(templateId),
  ]);

  const transformed = data.transform(results, wallet);
  updateRowData(transformed, waxPrice);

  row.classList.remove('updating');
  await sem.release();

  return transformed;
}

function refreshTimestamp() {
  const now = new Date();
  document.getElementById('timestamp').innerText = now.toLocaleTimeString();
}

function processResult(result) {
  const {templateId} = result;
  const row = getTemplateRow(templateId);

  let refreshInterval = 0;

  if (result.lagHours <= 1) {
    refreshInterval = 30 * 1000;
  } else if (result.lagHours <= 6) {
    refreshInterval = 60 * 1000;
  } else {
    return;
  }

  console.log('refresh', refreshInterval);
  if (refreshInterval < 30) {
    return;
  }

  clearTimeout(row.refreshTimeout);
  row.refreshTimeout = setTimeout(async () => {
    const price = await data.getWAXPrice();
    processResult(await updateRow(templateId, price));
  }, refreshInterval);

}

async function refresh() {
  exchangeTable.classList.add('updating');

  const waxPrice = await data.getWAXPrice();
  document.getElementById('waxPrice').innerText = waxPrice;

  setWalletButtonText();
  setTemplateIDsButtonText();

  const rows = document.querySelectorAll('#main-table tbody tr[data-template-id]');
  if (rows) {
    templateIds = [];
    rows.forEach((row) => templateIds.push(row.dataset.templateId));
  }

  // Clear all timeouts so we don't double up
  rows.forEach((row) => clearTimeout(row.refreshTimeout));

  display('#noResults', templateIds.length === 0);
  display('#results', templateIds.length > 0);

  if (templateIds.length === 0) {
    return;
  }

  const batches = [];

  for (let i = 0; i < templateIds.length; i += BATCH_SIZE) {
    const slice = templateIds.slice(i, i + BATCH_SIZE);
    batches.push(slice);
  }

  let results;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    results = await Promise.all(batch.map((templateId) => updateRow(templateId, waxPrice)));

    for (const result of results) {
      processResult(result);
    }

    setRefreshStatus();
  }

  console.log(results);

  refreshTableSort();
  refreshTimestamp();

  exchangeTable.classList.remove('updating');

  setTimeout(refresh, settings.getRefreshInterval());
}

function updateRowData(m, waxPrice) {
  const row = util.getTemplateRow(m.templateId);

  const floorPrice = row.querySelector('.price-wax-value');
  floorPrice.innerHTML = `${Math.round(m.floorPrice * 100) / 100}`;

  const floorPriceCell = row.querySelector('td.price-wax');
  floorPriceCell.dataset.sort = m.floorPrice;

  const usdPrice = row.querySelector('.price-usd-value');
  usdPrice.innerHTML = util.formatPrice(m.floorPrice * waxPrice);

  const gapCell = row.querySelector('td.price-gap');
  gapCell.dataset.sort = m.priceGapPercent;

  const target = row.querySelector('td.price-gap .price-gap-value');
  target.innerText = util.formatPercent(m.priceGapPercent);
  target.title = `mint #${m.mintNumber} last sold for ${m.lastPrice} WAX`;
  target.classList.remove('lower', 'higher');
  target.classList.add(m.priceGapPercent < 0 ? 'lower' : 'higher');

  row.classList.remove('dead', 'hot', 'down', 'up', 'fresh');
  row.classList.add(...priceAction(m.lagHours, m.priceGapPercent));

  const collectionCell = row.querySelector('td.collection-name');
  collectionCell.dataset.sort = m.collectionName;

  const templateIdLink = row.querySelector('a.template-id-link');
  templateIdLink.href = m.templateLink;
  templateIdLink.innerHTML = m.templateId;

  const collectionLink = row.querySelector('a.collection-name-link');
  collectionLink.href = m.collectionLink;
  collectionLink.innerHTML = m.collectionName;

  const nameLink = row.querySelector('a.asset-name-link');
  nameLink.href = m.listingsLink;
  nameLink.innerHTML = m.assetName;

  const historyLink = row.querySelector('a.history-link');
  historyLink.href = m.historyLink;

  const inventoryLink = row.querySelector('a.link-inventory');
  inventoryLink.href = m.inventoryLink;

  const lagTarget = row.querySelector('td.lag .lag-value');
  lagTarget.innerHTML = util.formatTimespan(Date.now() - m.lastSoldDate);

  const lagCell = row.querySelector('td.lag');
  lagCell.dataset.sort = Number(Date.now() - m.lastSoldDate).toString();
}

function priceAction(lagHours, priceDiff) {
  if (lagHours > DEAD_HOURS) {
    return ['dead'];
  }

  if (lagHours <= HOT_HOURS && priceDiff >= 0) {
    return ['fresh', 'hot'];
  }

  if (lagHours <= FRESH_HOURS) {
    if (priceDiff < 0) {
      return ['fresh', 'down'];
    }

    if (priceDiff > 0) {
      return ['fresh', 'up'];
    }
  }

  return [];
}

async function setWallet() {
  // eslint-disable-next-line no-alert
  wallet = prompt('Enter your wallet address', wallet);
  if (wallet) {
    settings.setWallet(wallet);
    await drawTable(templateIds, exchangeTable, wallet);
    await refresh(templateIds);
  }
}

function setWalletButtonText() {
  setWalletButton.innerText = wallet || 'No wallet set';
}

async function setTemplateIDs() {
  // eslint-disable-next-line no-alert
  const newTemplateIds = prompt('Enter your templateIDs delimited by commas', templateIds.join(','));
  if (newTemplateIds.length > 0) {
    templateIds = settings.setTemplateIds(newTemplateIds);
    await drawTable(templateIds, exchangeTable, wallet);
    await refresh(templateIds);
  }
}

async function shareTemplateIds() {
  const ids = settings.getTemplateIds();
  const link = `https://nftgaze.com/?template_ids=${ids.join(',')}`;
  // eslint-disable-next-line no-alert
  prompt('Here is your sharable link to the current list of template ids', link);
}

function setTemplateIDsButtonText() {
  setTemplateIDsButton.innerText = templateIds.length === 0
    ? 'No template IDs'
    : `${templateIds.length} template IDs`;
}

function display(selector, show) {
  document.querySelector(selector).classList[show ? 'remove' : 'add']('hidden');
}

function bindUI() {
  exchangeTable = document.querySelector('#exchangeTable');
  refreshTableButton = document.querySelector('#refreshTableButton');
  setTemplateIDsButton = document.querySelector('#setTemplateIDsButton');
  setWalletButton = document.querySelector('#setWalletButton');
  shareButton = document.querySelector('#shareButton');

  refreshTableButton.addEventListener('click', refresh);
  setTemplateIDsButton.addEventListener('click', setTemplateIDs);
  setWalletButton.addEventListener('click', setWallet);
  shareButton.addEventListener('click', shareTemplateIds);

  const refreshIntervalSpan = document.getElementById('refresh-interval');
  refreshIntervalSpan.innerText = Number(settings.getRefreshInterval() / 1000 / 60).toString();
}

(async () => {
  wallet = settings.getWallet();
  templateIds = settings.getTemplateIds();

  // FIXME: Need to figure out why templateIDs initialize to [0] when local storage is not initialized yet
  if (templateIds.length === 1 && templateIds[0] === 0) {
    templateIds = [];
  }

  bindUI();
  await drawTable(templateIds, exchangeTable, wallet);
  await refresh();
})();
