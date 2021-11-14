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

async function refresh() {
  const now = new Date();
  document.getElementById('timestamp').innerText = now.toLocaleTimeString();

  const waxPrice = await getWAXPrice();
  document.getElementById('waxPrice').innerText = waxPrice;

  setWalletButtonText();
  setTemplateIDsButtonText();

  display('#noResults', templateIds.length === 0);
  display('#results', templateIds.length > 0);

  if (templateIds.length === 0) {
    return;
  }

  // This is a very neive implementation. Needs some refactoring love to parse the results into a more resiliant data structure

  const lowestListed = [];

  for (let i = 0; i < templateIds.length; i++) {
    const templateID = templateIds[i];
    setRefreshStatus(`retrieving floor prices ${i + 1}/${templateIds.length}`);

    const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales/templates?symbol=WAX&state=1&max_assets=1&template_id=${templateID}&order=asc&sort=price`;
    const response = await fetch(url);
    const data = await response.json();
    lowestListed.push(data);
  }

  // Reset the table
  exchangeTable.innerHTML = '';

  for (let i = 0; i < templateIds.length; i++) {
    const templateId = templateIds[i];

    // Our simple view model
    const m = {
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

    if (lowestListed[i].data.length > 0) {
      const lowest = lowestListed[i].data[0];

      m.floorPrice = util.parseTokenValue(lowest.price.token_precision, lowest.price.amount);
      m.collectionName = lowest.collection_name;
      m.schemaName = lowest.assets[0].schema.schema_name;
      m.assetName = lowest.assets[0].name;

      m.historyLink = `https://wax.atomichub.io/market/history?collection_name=${m.collectionName}&data:text.name=${m.assetName}&order=desc&schema_name=${m.schemaName}&sort=updated&symbol=WAX`;
      m.listingsLink = `https://wax.atomichub.io/market?collection_name=${m.collectionName}&data:text.name=${m.assetName}&order=asc&schema_name=${m.schemaName}&sort=price&symbol=WAX`;
      m.collectionLink = `https://wax.atomichub.io/explorer/collection/${m.collectionName}`;
      m.templateLink = `https://wax.atomichub.io/explorer/template/${m.collectionName}/${templateId}`;
      m.inventoryLink = `https://wax.atomichub.io/profile/${wallet}?collection_name=${m.collectionName}&match=${m.assetName}&order=desc&sort=transferred`;
    }

    const output = `
  <tr data-template-id="${templateId}">
  <td class="template-id">
    <a href="${m.templateLink}" class="template-id-link" target="_blank">${templateId}</a>
  </td>
  <td class="collection-name">
    <a href="${m.collectionLink}" class="collection-name-link" target="_blank">${m.collectionName}</a>
  </td>
  <td class="asset-name">
    <a href="${m.listingsLink}" target="_blank">${m.assetName}</a>
    <i class="fa-solid fa-arrow-trend-up up" title="[trending] last sale under ${FRESH_HOURS} hours and floor price is higher than last sales price"></i>
    <i class="fa-solid fa-fire-flame-curved hot" title="[hot] last sale under ${HOT_HOURS} hours and floor price is higher than last sales price"></i>
    <i class="fa-solid fa-skull-crossbones dead" title="[stale] last sale over ${DEAD_HOURS / 24} days ago"></i>
    <i class="fa-solid fa-arrow-trend-down down" title="[down] last sale under ${FRESH_HOURS} hours and floor price is lower than last sales price"></i>
  </td>
  <td class="price-wax" style="text-align:right">
      <span class="price-wax-value">${util.formatPrice(m.floorPrice)}</span> WAX
  </td>
  <td class="price-diff" style="text-align:right"></td>
  <td class="lag">
    <span class="lag-value"></span> <a href="${m.historyLink}" target="_blank" class="float-right"><i class="fa-solid fa-timeline" title="show past sales"></i></a> 
  </td>
  <td class="price-usd" style="text-align:right">
      $<span class="price-usd-value">${util.formatPrice(m.floorPrice * waxPrice)}</span>
  </td>
  <td class="links">
      <a href="${m.inventoryLink}" target="_blank" class="${wallet ? '' : 'hidden'}"> 
        <i class="fa-solid fa-boxes" title="show items from this template in your AtomicHub inventory"></i>
      </a>
  </td>
  </tr>`;

    exchangeTable.insertAdjacentHTML('beforeend', output);
  }

  setRefreshStatus('');
  await updateStats(lowestListed);

  setTimeout(refresh, REFRESH_INTERVAL);
}

async function updateStats(lowestListed) {
  for (let i = 0; i < templateIds.length; i++) {
    const templateId = templateIds[i];
    const rowSelector = `tr[data-template-id="${templateId}"]`;
    const rowElem = document.querySelector(rowSelector);

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
        rowElem.classList.add(priceAction(lagHours, priceDiff));

        const mintNumber = last.assets[0].template_mint;

        const target = rowElem.querySelector('td.price-diff');
        target.innerText = util.formatPercent(priceDiff);
        target.title = `mint #${mintNumber} last sold for ${lastPrice} WAX`;
        target.classList.add(priceDiff < 0 ? 'lower' : 'higher');
      }
    }
  }

  setRefreshStatus('');
}

function priceAction(lagHours, priceDiff) {
  if (lagHours > DEAD_HOURS) {
    return 'dead';
  }

  if (lagHours <= HOT_HOURS && priceDiff > 0) {
    return 'hot';
  }

  if (lagHours <= FRESH_HOURS && priceDiff < 0) {
    return 'down';
  }

  if (lagHours <= FRESH_HOURS && priceDiff > 0) {
    return 'up';
  }

  return undefined;
}

function setRefreshStatus(msg) {
  document.getElementById('refreshStatus').innerText = msg;
}

function setWallet() {
  // eslint-disable-next-line no-alert
  wallet = prompt('Enter your wallet address', wallet);
  if (wallet) {
    settings.setWallet(wallet);
    refresh();
  }
}

function setWalletButtonText() {
  setWalletButton.innerText = wallet || 'No wallet set';
}

function setTemplateIDs() {
  // eslint-disable-next-line no-alert
  const newTemplateIds = prompt('Enter your templateIDs delimited by commas', templateIds.join(','));
  if (newTemplateIds.length > 0) {
    templateIds = settings.setTemplateIds(newTemplateIds);
    refresh();
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
  bindUI();
  await refresh();
})();
