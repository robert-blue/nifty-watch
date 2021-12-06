var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DEAD_HOURS, FRESH_HOURS, HOT_HOURS } from './config.js';
import * as util from './util.js';
export function setStatus(msg) {
    const statusElem = document.getElementById('refreshStatus');
    statusElem.innerText = msg !== null && msg !== void 0 ? msg : '';
}
export function clearStatus() {
    const statusElem = document.getElementById('refreshStatus');
    statusElem.innerText = '';
}
export function drawTableRows(templateIds, wallet) {
    return __awaiter(this, void 0, void 0, function* () {
        if (templateIds.length === 0) {
            return;
        }
        const targetElem = document.querySelector('tbody#exchangeTable');
        // Reset table
        targetElem.querySelectorAll('tr').forEach((row) => {
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
    });
}
/**
 * Returns table rows
 */
export function getAssetRows() {
    const selector = '#main-table tbody tr[data-template-id]';
    const rows = document.querySelectorAll(selector);
    return Array.from(rows);
}
export function getAssetRow(templateId) {
    const selector = `#main-table tbody tr[data-template-id=${templateId}]`;
    const rows = document.querySelectorAll(selector);
    if (rows.length > 1) {
        throw new Error(`More than one row found for template id ${templateId}`);
    }
    return rows[0];
}
export function setTimestamp() {
    const now = new Date();
    const timestampElem = document.getElementById('timestamp');
    if (timestampElem === null) {
        throw new Error('Could not find timestamp SPAN');
    }
    timestampElem.innerText = now.toLocaleTimeString();
}
export function sortTable() {
    const table = document.querySelector('#main-table');
    if (table && table.sort !== undefined) {
        table.sort();
    }
    else {
        console.warn('#main-table not sortable');
    }
}
export function bindRow(row, m, waxPrice) {
    var _a, _b;
    const floorPrice = row.querySelector('.price-wax-value');
    floorPrice.innerHTML = `${Math.round(m.floorPrice * 100) / 100}`;
    const floorPriceCell = row.querySelector('td.price-wax');
    floorPriceCell.dataset.sort = m.floorPrice.toString();
    const usdPrice = row.querySelector('.price-usd-value');
    usdPrice.innerHTML = util.formatPrice(m.floorPrice * waxPrice);
    const gapCell = row.querySelector('td.price-gap');
    gapCell.dataset.sort = (m.priceGapPercent) ? m.priceGapPercent.toString() : '';
    const target = row.querySelector('td.price-gap .price-gap-value');
    target.classList.remove('lower', 'higher');
    if (m.priceGapPercent) {
        target.innerText = util.formatPercent(m.priceGapPercent);
        target.classList.add(m.priceGapPercent < 0 ? 'lower' : 'higher');
        target.title = `mint #${m.mintNumber} last sold for ${m.lastPrice} WAX`;
    }
    else {
        target.innerText = 'N/A';
        target.title = 'No sales reported';
    }
    row.classList.remove('dead', 'hot', 'down', 'up', 'fresh', 'fire');
    row.classList.add(...priceAction(m.lagHours, m.increasing, m.priceHistory));
    const collectionCell = row.querySelector('td.collection-name');
    collectionCell.dataset.sort = m.collectionName;
    const lagCell = row.querySelector('td.lag');
    lagCell.dataset.sort = Number(Date.now() - m.lastSoldDate.getTime()).toString();
    bindLink(row, 'a.template-id-link', m.templateLink, m.templateId);
    bindLink(row, 'a.collection-name-link', m.collectionLink, m.collectionName);
    bindLink(row, 'a.schema-name-link', m.schemaLink, (_a = m.schemaName) === null || _a === void 0 ? void 0 : _a.toLowerCase());
    bindLink(row, 'a.asset-name-link', m.listingsLink, m.assetName);
    bindLink(row, 'a.history-link', m.historyLink, util.formatTimespan(Date.now() - m.lastSoldDate.getTime()));
    if (m.rarity) {
        bindLink(row, 'a.rarity-link', m.rarityLink, (_b = m.rarity) === null || _b === void 0 ? void 0 : _b.toLowerCase());
    }
    const inventoryLink = row.querySelector('a.link-inventory');
    inventoryLink.href = m.inventoryLink;
}
function bindLink(row, selector, href, text) {
    const link = row.querySelector(selector);
    link.href = href || '';
    link.innerHTML = text || '';
}
function priceAction(lagHours, increasing, priceHistory) {
    const result = [];
    if (lagHours >= DEAD_HOURS) {
        return ['dead'];
    }
    if (lagHours <= HOT_HOURS) {
        result.push('hot');
    }
    else if (lagHours <= FRESH_HOURS) {
        result.push('fresh');
    }
    if (increasing >= 3 / 4) {
        result.push('up');
    }
    else if (increasing <= 1 / 4) {
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
export function display(selector, show) {
    const elem = document.querySelector(selector);
    elem.classList[show ? 'remove' : 'add']('hidden');
}
export function bindWaxPrice(waxPrice) {
    const waxPriceElem = document.getElementById('waxPrice');
    if (waxPriceElem === null) {
        throw Error('waxPrice element not found');
    }
    waxPriceElem.innerText = waxPrice.toString();
}
//# sourceMappingURL=view.js.map