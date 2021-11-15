import {
  DEAD_HOURS, FRESH_HOURS, HOT_HOURS, REFRESH_INTERVAL,
} from './config.js';
import * as settings from './settings.js';
import * as util from './util.js';

let wallet = '';
let templateIds = [];

let exchangeTable;
let refreshTableButton;
let setWalletButton;
let setTemplateIDsButton;

async function getWAXPrice() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=WAX&vs_currencies=USD';
  const response = await fetch(url);
  const data = await response.json();
  return data.wax.usd;
}

async function drawTable() {
    if (templateIds.length === 0) {
      return;
    }

    // Reset the table
    exchangeTable.innerHTML = '';

    for (let templateId of templateIds) {
    const output = `
  <tr data-template-id="${templateId}">
  <td class="template-id"><a href="" class="template-id-link" target="_blank">${templateId}</a></td>
  <td class="collection-name"><a href="" class="collection-name-link" target="_blank"></a></td>
  <td class="asset-name">
    <a href="" target="_blank" class="asset-name-link"></a>
    <i class="fa-solid fa-arrow-trend-up up" title="[trending] last sale under ${FRESH_HOURS} hours and floor price is higher than last sales price"></i>
    <i class="fa-solid fa-fire-flame-curved hot" title="[hot] last sale under ${HOT_HOURS} hours and floor price is higher than last sales price"></i>
    <i class="fa-solid fa-skull-crossbones dead" title="[stale] last sale over ${DEAD_HOURS / 24} days ago"></i>
    <i class="fa-solid fa-arrow-trend-down down" title="[down] last sale under ${FRESH_HOURS} hours and floor price is lower than last sales price"></i>
  </td>
  <td class="price-wax" style="text-align:right"><span class="price-wax-value"></span> WAX</td>
  <td class="price-gap" style="text-align:right"><span class="price-gap-value"></span></td>
  <td class="lag">
    <span class="lag-value"></span>
    <a href="" target="_blank" class="history-link float-right"><i class="fa-solid fa-timeline" title="show past sales"></i></a> 
  </td>
  <td class="price-usd" style="text-align:right">
      $<span class="price-usd-value"></span>
  </td>
  <td class="links">
      <a href="" target="_blank" class="link-inventory ${wallet ? '' : 'hidden'}"> 
        <i class="fa-solid fa-boxes" title="show items from this template in your AtomicHub inventory"></i>
      </a>
  </td>
  </tr>`;

    exchangeTable.insertAdjacentHTML('beforeend', output);
  }
}

function updateMarketListing(m, waxPrice) {
  const row = document.querySelector(`tr[data-template-id="${m.templateId}"]`);
  const templateIdLink = row.querySelector(`a.template-id-link`);
  templateIdLink.href = m.templateLink;
  templateIdLink.innerHTML = m.templateId;

  const collectionLink = row.querySelector('a.collection-name-link');
  collectionLink.href = m.collectionLink;
  collectionLink.innerHTML = m.collectionName;

  const nameLink = row.querySelector('a.asset-name-link');
  nameLink.href = m.listingsLink;
  nameLink.innerHTML = m.assetName;

  const floorPrice = row.querySelector('.price-wax-value');
  floorPrice.innerHTML = `${Math.round(m.floorPrice * 100) / 100}`;

  const usdPrice = row.querySelector('.price-usd-value');
  usdPrice.innerHTML = util.formatPrice(m.floorPrice * waxPrice);

  const historyLink = row.querySelector('a.history-link');
  historyLink.href = m.historyLink;

  const inventoryLink = row.querySelector('a.link-inventory');
  inventoryLink.href = m.inventoryLink;
}

async function refresh() {
  const waxPrice = await getWAXPrice();
  document.getElementById('waxPrice').innerText = waxPrice;

  setWalletButtonText();
  setTemplateIDsButtonText();

  display('#noResults', templateIds.length === 0);
  display('#results', templateIds.length > 0);

  if (templateIds.length === 0) {
    return;
  }

  const lowestListed = [];

  for (let i = 0; i < templateIds.length; i++) {
    const templateId = templateIds[i];
    const statusMessage = `retrieving floor prices ${i + 1}/${templateIds.length}`;
    setRefreshStatus(statusMessage);

    const row = getTemplateRow(templateId);
    row.classList.add('updating')

    const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales/templates?symbol=WAX&state=1&max_assets=1&template_id=${templateId}&order=asc&sort=price`;
    let response = await fetch(url);

    while (response.status === 429) {
      setRefreshStatus('AtomicHub rate limit reached. Pausing updates.');
      await util.sleep(5 * 1000);
      setRefreshStatus(statusMessage);
      response = await fetch(url);
    }

    const data = await response.json();
    lowestListed.push(data);

    const lowest = data.data[0];

    // Our simple view model
    const m = {
        templateId: 0,
        assetName: '',
        collectionLink: '',
        collectionName: '',
        floorPrice: 0,
        historyLink: '',
        inventoryLink: '',
        listingsLink: '',
        schemaName: '',
        templateLink: '',
    };

    m.templateId = templateId;
    m.floorPrice = util.parseTokenValue(lowest.price.token_precision, lowest.price.amount);
    m.collectionName = lowest.collection_name;
    m.schemaName = lowest.assets[0].schema.schema_name;
    m.assetName = lowest.assets[0].name;

    m.historyLink = `https://wax.atomichub.io/market/history?collection_name=${m.collectionName}&data:text.name=${m.assetName}&order=desc&schema_name=${m.schemaName}&sort=updated&symbol=WAX`;
    m.listingsLink = `https://wax.atomichub.io/market?collection_name=${m.collectionName}&data:text.name=${m.assetName}&order=asc&schema_name=${m.schemaName}&sort=price&symbol=WAX`;
    m.collectionLink = `https://wax.atomichub.io/explorer/collection/${m.collectionName}`;
    m.templateLink = `https://wax.atomichub.io/explorer/template/${m.collectionName}/${templateId}`;
    m.inventoryLink = `https://wax.atomichub.io/profile/${wallet}?collection_name=${m.collectionName}&match=${m.assetName}&order=desc&sort=transferred`;

    updateMarketListing(m, waxPrice);

    row.classList.remove('updating')
  }

  setRefreshStatus('');
  await updateStats(lowestListed);

  const now = new Date();
  document.getElementById('timestamp').innerText = now.toLocaleTimeString();

  setTimeout(refresh, REFRESH_INTERVAL);
}

function getTemplateRow(templateId) {
  const rowSelector = `tr[data-template-id="${templateId}"]`;
  const rowElem = document.querySelector(rowSelector);
  return rowElem;
}

async function updateStats(lowestListed) {
  for (let i = 0; i < templateIds.length; i++) {
    const templateId = templateIds[i];
    const rowElem = getTemplateRow(templateId);
    rowElem.classList.add('updating')

    const statusMessage = `retrieving latest sales data ${i + 1}/${templateIds.length}`;
    setRefreshStatus(statusMessage);
    const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=3&max_assets=1&template_id=${templateId}&page=1&limit=1&order=desc&sort=updated`;
    let response = await fetch(url);

    while (response.status === 429) {
      setRefreshStatus('AtomicHub rate limit reached. Pausing updates.');
      await util.sleep(5 * 1000);
      setRefreshStatus(statusMessage);
      response = await fetch(url);
    }

    const data = await response.json();
    const last = data.data[0];

    if (lowestListed[i].data.length > 0) {
      const floor = lowestListed[i].data[0];

      const floorPrice = util.parseTokenValue(floor.price.token_precision, floor.price.amount);
      const lastPrice = util.parseTokenValue(last.price.token_precision, last.price.amount);
      const priceDiff = Math.round(((floorPrice - lastPrice) / floorPrice * 100) * 10) / 10;

      if (rowElem) {
        const lagTarget = rowElem.querySelector('td.lag .lag-value');
        const lastSoldDate = new Date(Number(last.updated_at_time));
        lagTarget.innerHTML = util.formatTimespan(Date.now() - lastSoldDate);

        const lagHours = (Date.now() - lastSoldDate) / 1000 / 60 / 60;
        rowElem.classList.remove('dead', 'hot', 'down', 'up', 'fresh');
        rowElem.classList.add(...priceAction(lagHours, priceDiff));

        const mintNumber = last.assets[0].template_mint;

        const target = rowElem.querySelector('td.price-gap .price-gap-value');
        target.innerText = util.formatPercent(priceDiff);
        target.title = `mint #${mintNumber} last sold for ${lastPrice} WAX`;
        target.classList.remove('lower', 'higher');
        target.classList.add(priceDiff < 0 ? 'lower' : 'higher');
      }
    }

    rowElem.classList.remove('updating')
  }

  setRefreshStatus('');
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

function setRefreshStatus(msg) {
  document.getElementById('refreshStatus').innerText = msg;
}

async function setWallet() {
  // eslint-disable-next-line no-alert
  wallet = prompt('Enter your wallet address', wallet);
  if (wallet) {
    settings.setWallet(wallet);
    await drawTable();
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
    await drawTable();
    await refresh();
  }
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
  setWalletButton = document.querySelector('#setWalletButton');
  setTemplateIDsButton = document.querySelector('#setTemplateIDsButton');
  refreshTableButton.addEventListener('click', refresh);
  setWalletButton.addEventListener('click', setWallet);
  setTemplateIDsButton.addEventListener('click', setTemplateIDs);
}

(async () => {
  wallet = settings.getWallet();
  templateIds = settings.getTemplateIds();

  // FIXME: Need to figure out why templateIDs initialize to [0] when local storage is not initialized yet
  if (templateIds.length === 1 && templateIds[0] === 0) {
    templateIds = [];
  }

  bindUI();
  await drawTable();
  await refresh();
})();
