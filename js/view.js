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
export function drawTableRows(templateIds, targetElem, wallet) {
    return __awaiter(this, void 0, void 0, function* () {
        if (templateIds.length === 0) {
            return;
        }
        // Reset table
        targetElem.querySelectorAll('tr').forEach((row) => {
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
    <i class="fa-solid fa-skull-crossbones dead" title="[stale] last sale over ${DEAD_HOURS / 24} days ago"></i>
    <i class="fa-solid fa-fire-flame-curved hot" title="[hot] last sale under ${HOT_HOURS} hours and 3 of the last 4 sales had same or increasing price"></i>
    <i class="fa-solid fa-arrow-trend-up up" title="[trending] 3 of the last 4 sales had same or increasing price"></i>
    <i class="fa-solid fa-arrow-trend-down down" title="[down] 3 of the last 4 sales had decreasing price"></i>
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
    row.classList.add(...priceAction(m.lagHours, m.increasing));
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
    lagTarget.innerHTML = util.formatTimespan(Date.now() - m.lastSoldDate.getTime());
    const lagCell = row.querySelector('td.lag');
    lagCell.dataset.sort = Number(Date.now() - m.lastSoldDate.getTime()).toString();
}
function priceAction(lagHours, increasing) {
    const result = [];
    if (lagHours >= DEAD_HOURS) {
        return ['dead'];
    }
    if (lagHours <= FRESH_HOURS) {
        result.push('fresh');
    }
    if (increasing >= 3 / 4) {
        if (lagHours <= HOT_HOURS) {
            result.push('hot');
        }
        else {
            result.push('up');
        }
    }
    else if (increasing <= 1 / 4) {
        result.push('down');
    }
    return result;
}
export function display(selector, show) {
    const elem = document.querySelector(selector);
    elem.classList[show ? 'remove' : 'add']('hidden');
}
//# sourceMappingURL=view.js.map