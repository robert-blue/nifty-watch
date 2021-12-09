import { DEAD_HOURS, FRESH_HOURS, HOT_HOURS } from './config.js';
import * as util from './util.js';
// eslint-disable-next-line import/named
import { AssetSale, RowView, Sortable } from './types.js';

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

export async function drawTableRows(templateIds: number[], wallet: string) {
  if (templateIds.length === 0) {
    return;
  }

  const targetElem = document.querySelector('tbody#exchangeTable') as HTMLTableSectionElement;

  // Reset table
  targetElem.querySelectorAll('tr').forEach((row: HasRefreshTimeout) => {
    clearTimeout(row.refreshTimeoutId);
    row.remove();
  });

  templateIds.forEach((templateId) => {
    const output = `
  <tr data-template-id="${templateId}">
  <td class="template-id">
    <a href="" class="template-id-link" target="_blank">${templateId}</a>
    <i class="fa-solid fa-trash-can delete-row" title="delete"></i>
  </td>
  <td class="collection-name"><a href="" class="collection-name-link" target="_blank"></a></td>
  <td class="schema-name"><a href="" class="schema-name-link" target="_blank"></a></td>
  <td class="rarity"><a href="" class="rarity-link" target="_blank"></a></td>
  <td class="asset-name">
    <a href="" target="_blank" class="asset-name-link"></a>
    <i class="fa-solid fa-skull-crossbones dead" title="[stale] last sale over ${DEAD_HOURS / 24} days ago"></i>
    <i class="fa-solid fa-fire-flame-curved hot" title="[hot] last 5 sales occurred within the last ${HOT_HOURS} hours"></i>
    <i class="fa-solid fa-arrow-trend-up up" title="[trending] 3 of the last 4 sales had same or increasing price"></i>
    <i class="fa-solid fa-arrow-trend-down down" title="[down] 3 of the last 4 sales had decreasing price"></i>
    <i class="fa-solid fa-triangle-exclamation sale-imminent"></i>
    <i class="fa-solid fa-hand-holding-dollar sold" title="Your NFT sold in the last 5 sales!"></i>
    <i class="fa-solid fa-rotate"></i>
  </td>
  <td class="price-wax" style="text-align:right"><span class="price-wax-value"></span> WAX</td>
  <td class="price-gap" style="text-align:right"><span class="price-gap-value"></span></td>
  <td class="lag">
    <a href="" target="_blank" title="show past sales" class="history-link float-right"></a>
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

export function getAssetRow(templateId: string): HTMLTableRowElement {
  const selector = `#main-table tbody tr[data-template-id=${templateId}]`;
  const rows = document.querySelectorAll<HTMLTableRowElement>(selector);
  if (rows.length > 1) {
    throw new Error(`More than one row found for template id ${templateId}`);
  }

  return rows[0] as HTMLTableRowElement;
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
  if (table && table.sort !== undefined) {
    table.sort();
  } else {
    console.warn('#main-table not sortable');
  }
}

function bindImminent(row: HTMLTableRowElement, m: RowView, wallets: string[]) {
  row.classList.remove('sale-imminent');
  const rowDataset = row.dataset;

  if (!m.listings) {
    return;
  }

  for (let i = m.listings.length; i > 0; i--) {
    const listing = m.listings[i - 1];

    if (listing.seller && wallets.includes(listing.seller.toLowerCase())) {
      row.classList.add('sale-imminent');
      rowDataset.fromFloor = i.toString();

      const icon = row.querySelector('i.sale-imminent') as HTMLElement;
      if (i === 1) {
        icon.title = `Your listing for ${listing.price} WAX is at the floor!`;
      } else {
        icon.title = `Your listing for ${listing.price} WAX is ${i - 1} away from the floor`;
      }
    }
  }
}

function bindSold(row: HTMLTableRowElement, m: RowView, wallets: string[]) {
  row.classList.remove('sold');

  m.priceHistory.forEach((history) => {
    if (history.seller && wallets.includes(history.seller.toLowerCase())) {
      row.classList.add('sold');
    }
  });
}

export function bindRow(row: HTMLTableRowElement, m: RowView, waxPrice: number, wallets: string[]) {
  const floorPrice = row.querySelector('.price-wax-value') as HTMLElement;
  if (m.floorPrice === undefined) {
    floorPrice.innerHTML = 'N/A';
  } else {
    floorPrice.innerHTML = `${Math.round(m.floorPrice * 100) / 100}`;
  }

  const floorPriceCell = row.querySelector('td.price-wax') as HTMLElement;
  floorPriceCell.dataset.sort = (m.floorPrice || 0).toString();

  const usdPrice = row.querySelector('.price-usd-value') as HTMLElement;
  usdPrice.innerHTML = util.formatPrice((m.floorPrice || 0) * waxPrice);

  const gapCell = row.querySelector('td.price-gap') as HTMLElement;
  gapCell.dataset.sort = (m.priceGapPercent) ? m.priceGapPercent.toString() : '';

  const target = row.querySelector('td.price-gap .price-gap-value') as HTMLElement;
  target.classList.remove('lower', 'higher');
  if (m.priceGapPercent !== undefined) {
    target.innerText = util.formatPercent(m.priceGapPercent);
    target.classList.add(m.priceGapPercent < 0 ? 'lower' : 'higher');
    target.title = `mint #${m.mintNumber} last sold for ${m.lastPrice} WAX`;
  } else {
    target.innerText = 'N/A';
    target.title = 'No sales or listings';
  }

  row.classList.remove('dead', 'hot', 'down', 'up', 'fresh', 'fire');
  if (m.lastPrice !== undefined && m.floorPrice !== undefined) {
    row.classList.add(...priceAction(m.lagHours, m.increasing, m.priceHistory));
  }

  bindImminent(row, m, wallets);
  bindSold(row, m, wallets);

  const collectionCell = row.querySelector('td.collection-name') as HTMLElement;
  collectionCell.dataset.sort = m.collectionName;

  const lagCell = row.querySelector('td.lag') as HTMLElement;
  lagCell.dataset.sort = Number(Date.now() - m.lastSoldDate.getTime()).toString();

  bindLink(row, 'a.template-id-link', m.templateLink, m.templateId);
  bindLink(row, 'a.collection-name-link', m.collectionLink, m.collectionName);
  bindLink(row, 'a.schema-name-link', m.schemaLink, m.schemaName?.toLowerCase());
  bindLink(row, 'a.asset-name-link', m.listingsLink, m.assetName);

  const lastSoldMS = m.lastSoldDate.getTime();
  const epochMS = (new Date(0)).getTime();
  const lag = (lastSoldMS === epochMS) ? 'N/A' : util.formatTimespan(
    Date.now() - m.lastSoldDate.getTime(),
  );
  bindLink(row, 'a.history-link', m.historyLink, lag);

  if (m.rarity) {
    bindLink(row, 'a.rarity-link', m.rarityLink, m.rarity?.toLowerCase());
  }

  const inventoryLink = row.querySelector('a.link-inventory') as HTMLLinkElement;
  inventoryLink.href = m.inventoryLink;
}

function bindLink(row: HTMLTableRowElement, selector: string, href?: string, text?: string) {
  const link = row.querySelector(selector) as HTMLLinkElement;
  link.href = href || '';
  link.innerHTML = text || '';
}

function priceAction(lagHours: number|undefined, increasing: number, priceHistory?: AssetSale[]) {
  const result: string[] = [];

  if (lagHours === undefined) {
    return [''];
  }

  if (lagHours >= DEAD_HOURS) {
    return ['dead'];
  }

  if (lagHours <= HOT_HOURS) {
    result.push('hot');
  } else if (lagHours <= FRESH_HOURS) {
    result.push('fresh');
  }

  if (increasing >= 3 / 4) {
    result.push('up');
  } else if (increasing <= 1 / 4) {
    result.push('down');
  }

  if (priceHistory) {
    const hotBoundary = new Date(Date.now() - (HOT_HOURS * 60 * 60 * 1000));
    const fire = priceHistory.every((history) => history.date > hotBoundary);
    if (fire) {
      result.push('fire');
    }
  }

  return result;
}

export function display(selector: string, show: boolean) {
  const elem = document.querySelector(selector) as HTMLElement;
  elem.classList[show ? 'remove' : 'add']('hidden');
}

export function bindWaxPrice(waxPrice: number) {
  const waxPriceElem = document.getElementById('waxPrice');
  if (waxPriceElem === null) {
    throw Error('waxPrice element not found');
  }

  waxPriceElem.innerText = waxPrice.toString();
}

export function bindLinks(m: RowView, templateId: string, wallet: string): RowView {
  const b = m;
  b.collectionLink = `https://wax.atomichub.io/explorer/collection/${m.collectionName}`;
  b.templateLink = `https://wax.atomichub.io/explorer/template/${m.collectionName}/${templateId}`;

  const rarity = (m.rarity) ? `&data:text.rarity=${m.rarity}` : '';
  b.inventoryLink = `https://wax.atomichub.io/profile/${wallet}?collection_name=${m.collectionName}${rarity}&match=${m.assetName}&order=desc&sort=transferred`;
  b.historyLink = `https://wax.atomichub.io/market/history?collection_name=${m.collectionName}${rarity}&match=${m.assetName}&order=desc&schema_name=${m.schemaName}&sort=updated&symbol=WAX`;
  b.listingsLink = `https://wax.atomichub.io/market?collection_name=${m.collectionName}${rarity}&match=${m.assetName}&order=asc&schema_name=${m.schemaName}&sort=price&symbol=WAX`;
  b.rarityLink = `https://wax.atomichub.io/market?collection_name=${m.collectionName}${rarity}&order=asc&schema_name=${m.schemaName}&sort=price&symbol=WAX`;
  b.schemaLink = `https://wax.atomichub.io/market?collection_name=${m.collectionName}&order=asc&schema_name=${m.schemaName}&sort=price&symbol=WAX`;

  return b;
}
