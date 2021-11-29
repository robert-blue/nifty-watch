import { DEAD_HOURS, FRESH_HOURS, HOT_HOURS } from './config.js';
import * as util from './util.js';
import { AtomicModel, Sortable } from './types.js';

export function setStatus(msg?: string) {
  const statusElem = document.getElementById('refreshStatus') as HTMLElement;
  statusElem.innerText = msg ?? '';
}

export function clearStatus() {
  const statusElem = document.getElementById('refreshStatus') as HTMLElement;
  statusElem.innerText = '';
}

interface HasRefreshTimeout extends HTMLTableRowElement {
  refreshTimeoutId?: number
}

export async function drawTableRows(templateIds: string[], targetElem: HTMLTableSectionElement, wallet: string) {
  if (templateIds.length === 0) {
    return;
  }

  // Reset table
  targetElem.querySelectorAll('tr').forEach((row: HasRefreshTimeout) => {
    clearTimeout(row.refreshTimeoutId);
    if (row.parentNode === null) {
      throw new Error('Parent node for row not found');
    }

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
 */
export function getAssetRows(): Array<HTMLTableRowElement> {
  const selector = '#main-table tbody tr[data-template-id]';
  const rows = document.querySelectorAll<HTMLTableRowElement>(selector);
  return Array.from<HTMLTableRowElement>(rows);
}

export function setTimestamp() {
  const now = new Date();
  const timestampElem = document.getElementById('timestamp');
  if (timestampElem === null) {
    throw new Error('Could not find timestamp SPAN');
  }

  (timestampElem as HTMLSpanElement).innerText = now.toLocaleTimeString();
}

export function sortTable() {
  const table = document.querySelector('#main-table') as Sortable;
  console.log('sortable', table);
  if (table && table.sort !== undefined) {
    table.sort();
  } else {
    console.warn('#main-table not sortable');
  }
}

export function bindRow(row: HTMLElement, m: AtomicModel, waxPrice: number) {
  const floorPrice = row.querySelector('.price-wax-value') as HTMLElement;
  floorPrice.innerHTML = `${Math.round(m.floorPrice * 100) / 100}`;

  const floorPriceCell = row.querySelector('td.price-wax') as HTMLElement;
  floorPriceCell.dataset.sort = m.floorPrice.toString();

  const usdPrice = row.querySelector('.price-usd-value') as HTMLElement;
  usdPrice.innerHTML = util.formatPrice(m.floorPrice * waxPrice);

  const gapCell = row.querySelector('td.price-gap') as HTMLElement;
  gapCell.dataset.sort = m.priceGapPercent.toString();

  const target = row.querySelector('td.price-gap .price-gap-value') as HTMLElement;
  target.innerText = util.formatPercent(m.priceGapPercent);
  target.title = `mint #${m.mintNumber} last sold for ${m.lastPrice} WAX`;
  target.classList.remove('lower', 'higher');
  target.classList.add(m.priceGapPercent < 0 ? 'lower' : 'higher');

  row.classList.remove('dead', 'hot', 'down', 'up', 'fresh');
  row.classList.add(...priceAction(m.lagHours, m.priceGapPercent));

  const collectionCell = row.querySelector('td.collection-name') as HTMLElement;
  collectionCell.dataset.sort = m.collectionName;

  const templateIdLink = row.querySelector('a.template-id-link') as HTMLLinkElement;
  templateIdLink.href = m.templateLink;
  templateIdLink.innerHTML = m.templateId;

  const collectionLink = row.querySelector('a.collection-name-link') as HTMLLinkElement;
  collectionLink.href = m.collectionLink;
  collectionLink.innerHTML = m.collectionName;

  const nameLink = row.querySelector('a.asset-name-link') as HTMLLinkElement;
  nameLink.href = m.listingsLink;
  nameLink.innerHTML = m.assetName;

  const historyLink = row.querySelector('a.history-link') as HTMLLinkElement;
  historyLink.href = m.historyLink;

  const inventoryLink = row.querySelector('a.link-inventory') as HTMLLinkElement;
  inventoryLink.href = m.inventoryLink;

  const lagTarget = row.querySelector('td.lag .lag-value') as HTMLElement;
  lagTarget.innerHTML = util.formatTimespan(Date.now() - m.lastSoldDate.getTime());

  const lagCell = row.querySelector('td.lag') as HTMLElement;
  lagCell.dataset.sort = Number(Date.now() - m.lastSoldDate.getTime()).toString();
}

function priceAction(lagHours: number, priceDiff: number) {
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

export function display(selector: string, show: boolean) {
  const elem = document.querySelector(selector) as HTMLElement;
  elem.classList[show ? 'remove' : 'add']('hidden');
}
