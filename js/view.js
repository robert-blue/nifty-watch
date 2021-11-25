import { DEAD_HOURS, FRESH_HOURS, HOT_HOURS } from './config.js';
import * as util from './util.js';

export function setStatus(msg) {
  document.getElementById('refreshStatus').innerText = msg ?? '';
}

export function clearStatus() {
  document.getElementById('refreshStatus').innerText = '';
}

/**
 * @param {Number[]} templateIds
 * @param {HTMLElement} targetElem
 * @param {string} wallet
 */
export async function drawTableRows(templateIds, targetElem, wallet) {
  if (templateIds.length === 0) {
    return;
  }

  // Reset table
  targetElem.querySelectorAll('tr').forEach((row) => {
    clearTimeout(row.refreshTimeoutId);
    row.parentNode.removeChild(row);
  });

  templateIds.forEach((templateId) => {
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
    <i class="fa-solid fa-rotate"></i>
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

    targetElem.insertAdjacentHTML('beforeend', output);
  });
}

/**
 * Returns table rows
 * @returns {HTMLTableRowElement[]}
 */
export function getAssetRows() {
  const rows = document.querySelectorAll('#main-table tbody tr[data-template-id]');
  return [...rows];
}

export function setTimestamp() {
  const now = new Date();
  document.getElementById('timestamp').innerText = now.toLocaleTimeString();
}

export function sortTable() {
  const table = document.querySelector('#main-table');
  if (table && table.sort !== undefined) {
    table.sort();
  }
}

/**
 * Bind the model to the table row
 * @param {Element} row
 * @param {AtomicModel} m
 * @param {number} waxPrice
 */
export function bindRow(row, m, waxPrice) {
  const floorPrice = row.querySelector('.price-wax-value');
  floorPrice.innerHTML = `${Math.round(m.floorPrice * 100) / 100}`;

  const floorPriceCell = row.querySelector('td.price-wax');
  floorPriceCell.dataset.sort = m.floorPrice.toString();

  const usdPrice = row.querySelector('.price-usd-value');
  usdPrice.innerHTML = util.formatPrice(m.floorPrice * waxPrice);

  const gapCell = row.querySelector('td.price-gap');
  gapCell.dataset.sort = m.priceGapPercent.toString();

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

export function display(selector, show) {
  document.querySelector(selector).classList[show ? 'remove' : 'add']('hidden');
}

