import { DEAD_HOURS, FRESH_HOURS, HOT_HOURS } from './config.js';

export function setRefreshStatus(msg) {
  document.getElementById('refreshStatus').innerText = msg;
}

export async function drawTable(templateIds, targetElem, wallet) {
  if (templateIds.length === 0) {
    return;
  }

  // Reset the table
  targetElem.innerHTML = '';

  for (const templateId of templateIds) {
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

    targetElem.insertAdjacentHTML('beforeend', output);
  }
}
