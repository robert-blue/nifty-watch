const KEY_TEMPLATE_IDS = 'templateIDs';
const KEY_WALLET = 'wallet';

const exchangeTable = document.getElementById('exchangeTable');
const refreshTableButton = document.getElementById('refreshTableButton');
const setWalletButton = document.querySelector('#setWalletButton');
const setTemplateIDsButton = document.querySelector('#setTemplateIDsButton');

async function getWAXPrice() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=WAX&vs_currencies=USD'
  const response = await fetch(url);
  const data = await response.json();
  return data.wax.usd;
}

async function populatePage() {
  const now = new Date();
  document.getElementById('timestamp').innerText = now.toLocaleTimeString();

  loadWallet();
  loadTemplateIDs();

  const waxPrice = await getWAXPrice();
  document.getElementById("waxPrice").innerText = waxPrice

  if (templateIds.length === 0) {
    display('#noResults', true);
    display('#results', false);
    return;
  }

  display('#noResults', false);
  display('#results', true);

  // This is a very neive implementation. Needs some refactoring love to parse the results into a more resiliant data structure

  const lowestListed = []

  for (var i = 0; i < templateIds.length; i++) {
    const templateID = templateIds[i]
    document.getElementById("refreshStatus").innerText = `retrieving floor prices ${i}/${templateIds.length}`

    const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales/templates?symbol=WAX&state=1&max_assets=1&template_id=${templateID}&order=asc&sort=price`;
    const response = await fetch(url);
    console.log('lowest resp', response)
    const data = await response.json();
    lowestListed.push(data)
  }

  // Reset the table
  exchangeTable.innerHTML = '';

  for (var i = 0; i < templateIds.length; i++) {
    const templateId = templateIds[i]
    const lowest = lowestListed[i].data[0]
    const floorPrice = parseTokenValue(lowest.price.token_precision, lowest.price.amount)
    const saleId = lowest.sale_id
    const collectionName = lowest.collection_name
    const schemaName = lowest.assets[0].schema.schema_name
    const assetName = lowest.assets[0].name

    const historyLink = `https://wax.atomichub.io/market/history?collection_name=${collectionName}&data:text.name=${assetName}&order=desc&schema_name=${schemaName}&sort=updated&symbol=WAX`
    const buyLink = `https://wax.atomichub.io/market/sale/${saleId}`
    const listingsLink = `https://wax.atomichub.io/market?collection_name=${collectionName}&data:text.name=${assetName}&order=asc&schema_name=${schemaName}&sort=price&symbol=WAX`
    const collectionLink = `https://wax.atomichub.io/explorer/collection/${collectionName}`
    const templateLink = `https://wax.atomichub.io/explorer/template/${collectionName}/${templateId}`
    const inventoryLink = `https://wax.atomichub.io/profile/${waxAddress}?collection_name=${collectionName}&match=${assetName}&order=desc&sort=transferred`

    const output = `
<tr data-template-id="${templateId}">
<td class="template-id">
  <a href="${templateLink}" class="template-id-link" target="_blank">${templateId}</a>
</td>
<td class="collection-name">
  <a href="${collectionLink}" class="collection-name-link" target="_blank">${collectionName}</a>
</td>
<td class="asset-name">
  <a href="${listingsLink}" target="_blank">${assetName}</a>
  <i class="fa-solid fa-fire-flame-curved hot" title="last sale under ${HOT_HOURS} hours and floor price is higher than last sales price"></i>
  <i class="fa-solid fa-skull-crossbones dead" title="last sale was over ${DEAD_HOURS / 24} days ago"></i>
  <i class="fa-solid fa-arrow-trend-down declining" title="floor price is lower than last sales price"></i>
</td>
<td class="price-wax">
    <span class="price-wax-value">${formatPrice(floorPrice)}</span> WAX
</td>
<td class="price-diff"></td>
<td class="lag">
  <span class="lag-value"></span> <a href="${historyLink}" target="_blank" class="float-right"><i class="fa-solid fa-timeline" title="show past sales"></i></a> 
</td>
<td class="price-usd">
    $<span class="price-usd-value">${(floorPrice * waxPrice).toFixed(2)}</span>
</td>
<td class="links">
    <a href="${inventoryLink}" target="_blank" class="${waxAddress ? "" : "hidden"}"> 
      <i class="fa-solid fa-boxes" title="show items from this template in your AtomicHub inventory"></i>
    </a>
</td>
</tr>`

    exchangeTable.insertAdjacentHTML('beforeend', output)
  }

  document.getElementById("refreshStatus").innerText = ""

  await updateStats(lowestListed);

  setTimeout(populatePage, refreshInterval);
}

async function updateStats(lowestListed) {
  const refreshStatusElem = document.getElementById("refreshStatus")

  for (var i = 0; i < templateIds.length; i++) {
    const templateId = templateIds[i]

    const rowSelector = `tr[data-template-id="${templateId}"]`;
    const rowElem = document.querySelector(rowSelector);

    refreshStatusElem.innerText = `retrieving latest sales data ${i}/${templateIds.length}`

    const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=3&max_assets=1&template_id=${templateId}&page=1&limit=1&order=desc&sort=updated`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(`LAST SOLD ${templateId}`, data)

    const last = data.data[0];
    const floor = lowestListed[i].data[0];

    const floorPrice = parseTokenValue(floor.price.token_precision, floor.price.amount);
    const lastPrice = parseTokenValue(last.price.token_precision, last.price.amount);
    const priceDiff = Math.round(((floorPrice - lastPrice) / floorPrice * 100) * 10) / 10;

    const lagTarget = rowElem.querySelector('td.lag .lag-value');
    const lastSoldDate = new Date(Number(last.updated_at_time));
    lagTarget.innerHTML = formatTimespan(Date.now() - lastSoldDate);

    const lagHours = (Date.now() - lastSoldDate) / 1000 / 60 / 60;
    const isPriceDiscovery = lagHours <= HOT_HOURS && priceDiff > 0;
    const isFalling = lagHours <= DEAD_HOURS && priceDiff < 0;

    if (lagHours > DEAD_HOURS) {
      rowElem.classList.add('dead')
    } else if (isFalling) {
      rowElem.classList.add('declining')
    }
    
    if (isPriceDiscovery) {
      rowElem.classList.add('hot')
    } 
    
    const mintNumber = last.assets[0].template_mint;

    const target = rowElem.querySelector('td.price-diff');
    target.innerText = formatPercent(priceDiff);
    target.title = `mint #${mintNumber} last sold for ${lastPrice} WAX`;
    target.classList.add(priceDiff < 0 ? 'lower' : 'higher');
  }

  refreshStatusElem.innerText = ""
}

function elem(id) {
  return document.getElementById(id)
}

function formatPercent(value) {
  const prefix = value < 0 ? '' : '+';
  return `${prefix}${value}%`
}

function loadWallet() {
  waxAddress = localStorage.getItem(KEY_WALLET);
  setWalletButton.innerText = waxAddress || 'No wallet set';
}

function loadTemplateIDs() {
  const t = localStorage.getItem(KEY_TEMPLATE_IDS);
  if (t) {
    templateIds = t.split(',').map(x => Number(x)).sort();
    setTemplateIDsButton.innerText = `${templateIds.length} template IDs`;
  } else {
    setTemplateIDsButton.innerText = 'No template IDs';
  }
}

function setWallet() {
  const wallet = prompt('Enter your wallet address', waxAddress || '');
  if (wallet) {
    localStorage.setItem(KEY_WALLET, wallet);
    loadWallet();
  }
}

function setTemplateIDs() {
  const t = prompt('Enter your templateIDs delimited by commas', templateIds.join(','));
  if (t) {
    localStorage.setItem(KEY_TEMPLATE_IDS, t);
    populatePage();
  }
}

function display(selector, show) {
  console.log("display", selector)
  document.querySelector(`${selector}`).classList[show ? 'remove' : 'add']('hidden');
}

(async () => {
  await populatePage();
})();

refreshTableButton.addEventListener('click', populatePage);
setWalletButton.addEventListener('click', setWallet);
setTemplateIDsButton.addEventListener('click', setTemplateIDs);
