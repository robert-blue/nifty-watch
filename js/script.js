import { DEAD_HOURS, FRESH_HOURS, HOT_HOURS } from './config.js';
import * as settings from './settings.js';
import * as util from './util.js';
import * as data from './data.js';
import { drawTable, setRefreshStatus } from './display.js';

let wallet = '';
let templateIds = [];

let exchangeTable;
let refreshTableButton;
let setTemplateIDsButton;
let setWalletButton;
let shareButton;

async function refresh() {
  const waxPrice = await data.getWAXPrice();
  document.getElementById('waxPrice').innerText = waxPrice;

  setWalletButtonText();
  setTemplateIDsButtonText();

  display('#noResults', templateIds.length === 0);
  display('#results', templateIds.length > 0);

  if (templateIds.length === 0) {
    return;
  }

  for (let i = 0; i < templateIds.length; i++) {
    const templateId = templateIds[i];
    const row = util.getTemplateRow(templateId);
    row.classList.add('updating');

    let statusMessage = `retrieving template data ${i + 1}/${templateIds.length}: last sold`;
    setRefreshStatus(statusMessage);
    const lastSold = await data.getLastSold(templateId, wallet);

    if (!lastSold) {
      row.classList.add('hidden');
      continue;
    }

    statusMessage = `retrieving template data ${i + 1}/${templateIds.length}: floor listing`;
    setRefreshStatus(statusMessage);
    const floor = await data.getFloorListing(templateId, lastSold);

    updateLastSold(lastSold);

    if (floor) {
      updateFloor(floor, waxPrice);
    }

    row.classList.remove('updating');
  }

  setRefreshStatus('');

  const table = document.querySelector('#main-table');
  table.refreshSort();

  const now = new Date();
  document.getElementById('timestamp').innerText = now.toLocaleTimeString();

  setTimeout(refresh, settings.getRefreshInterval());
}

function updateFloor(m, waxPrice) {
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
}

function updateLastSold(m) {
  const row = util.getTemplateRow(m.templateId);

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
    await refresh();
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
    await refresh();
  }
}

async function shareTemplateIds() {
  const templateIds = settings.getTemplateIds();
  const link = `https://nftgaze.com/?template_ids=${templateIds.join(',')}`;
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
