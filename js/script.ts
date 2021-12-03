import {
  FRESH_HOURS,
  FRESH_HOURS_REFRESH_INTERVAL,
  HOT_HOURS,
  HOT_HOURS_REFRESH_INTERVAL,
} from './config.js';
import * as settings from './settings.js';
import * as util from './util.js';
import * as data from './data.js';
import * as view from './view.js';
import { display } from './view.js';
import {
  // eslint-disable-next-line import/named
  AtomicListing, RowView, AtomicSale, TemplateRow,
} from './types.js';
import sortable from './vendor/sortable.js';

let wallet = '';
let templateIds: string[] = [];
let globalTimeout: number|undefined;

let refreshTableButton: HTMLButtonElement;
let setTemplateIDsButton: HTMLButtonElement;
let setWalletButton: HTMLButtonElement;
let shareButton: HTMLButtonElement;

async function refreshRow(row: HTMLTableRowElement, waxPrice: number) {
  row.classList.add('updating');

  const templateId = row.dataset.templateId ?? '';

  const results: [AtomicSale, AtomicListing] = await Promise.all([
    await data.getLastSold(templateId, view.setStatus),
    await data.getFloorListing(templateId, view.setStatus),
  ]);

  const model = data.transform(results[0], results[1], templateId, wallet);
  view.bindRow(row, model, waxPrice);

  row.classList.remove('updating');

  view.sortTable();

  return model;
}

function supplementalRefresh(result: RowView) {
  const { templateId } = result;
  const row = util.getTemplateRow(templateId);

  let refreshInterval = 0;

  if (result.lagHours <= HOT_HOURS) {
    refreshInterval = HOT_HOURS_REFRESH_INTERVAL;
  } else if (result.lagHours <= FRESH_HOURS) {
    refreshInterval = FRESH_HOURS_REFRESH_INTERVAL;
  } else {
    return;
  }

  clearTimeout(row.refreshTimeoutId);
  row.refreshTimeoutId = setTimeout(async () => {
    const price = await data.getWAXPrice();
    supplementalRefresh(await refreshRow(row, price));
    view.sortTable();
  }, refreshInterval);
}

function getTableBody(): HTMLTableSectionElement {
  return document.querySelector('tbody#exchangeTable') as HTMLTableSectionElement;
}

async function refresh() {
  const tBody = getTableBody();
  tBody.classList.add('updating');

  const waxPrice = await data.getWAXPrice();
  const waxPriceElem = document.getElementById('waxPrice');
  if (waxPriceElem === null) {
    throw Error('waxPrice element not found');
  }

  waxPriceElem.innerText = waxPrice.toString();

  setWalletButtonText();
  setTemplateIDsButtonText();
  display('#noResults', templateIds.length === 0);
  display('#results', templateIds.length > 0);

  const rows = view.getAssetRows();
  clearTimeouts(rows);

  const results = await Promise.all(rows.map((row) => refreshRow(row, waxPrice)));
  results.forEach((result) => supplementalRefresh(result));

  view.sortTable();
  view.setTimestamp();
  view.clearStatus();

  tBody.classList.remove('updating');

  clearTimeout(globalTimeout);
  globalTimeout = setTimeout(refresh, settings.getRefreshInterval());
}

function clearTimeouts(rows: Array<TemplateRow>) {
  rows.forEach((row) => {
    clearTimeout(row.refreshTimeoutId);
    // eslint-disable-next-line no-param-reassign
    delete row.refreshTimeoutId;
  });
}

async function setWallet() {
  // eslint-disable-next-line no-alert
  const input = prompt('Enter your wallet address', wallet);
  if (input === null) {
    throw new Error('No wallet address provided');
  }

  wallet = input;

  settings.setWallet(wallet);
  await view.drawTableRows(templateIds, wallet);
  await refresh();
}

async function setTemplateIDs() {
  // eslint-disable-next-line no-alert
  const newTemplateIds = prompt('Enter your templateIDs delimited by commas', templateIds.join(','));
  if (newTemplateIds === null) {
    return;
  }

  if (newTemplateIds.length > 0) {
    templateIds = settings.setTemplateIds(newTemplateIds);
    setTemplateIDsButtonText();
    await view.drawTableRows(templateIds, wallet);
    await refresh();
  }
}

async function shareTemplateIds() {
  const ids = settings.getTemplateIds();
  const link = `https://nftgaze.com/?template_ids=${ids.join(',')}`;
  // eslint-disable-next-line no-alert
  prompt('Here is your sharable link to the current list of template ids', link);
}

function setTemplateIDsButtonText() {
  setTemplateIDsButton.innerText = templateIds.length === 0
    ? 'No template IDs'
    : `${templateIds.length} template IDs`;
}

async function deleteRowHandler(e: MouseEvent) {
  if (e.target === null) {
    return;
  }

  const element = e.target as HTMLElement;
  if (!element.classList.contains('delete-row')) {
    return;
  }

  const row = util.findParentNode(element, 'TR');
  const attr = row.getAttribute('data-template-id');
  if (attr !== null) {
    const templateId = attr.toString();

    const doDelete = window.confirm(`Are you sure you want to remove this template (#${templateId})? `);
    if (!doDelete) {
      return;
    }

    const index = templateIds.indexOf(templateId);
    delete templateIds[index];
    templateIds = settings.setTemplateIds(templateIds);
    setTemplateIDsButtonText();
    row.remove();
  }
}

function setWalletButtonText() {
  setWalletButton.innerText = wallet || 'No wallet set';
}

function bindUI() {
  const headerCell = document.querySelector('#main-table th.dir-u, #main-table th.dir-d');
  sortable(headerCell as HTMLTableCellElement);

  refreshTableButton = document.querySelector('#refreshTableButton') as HTMLButtonElement;
  setTemplateIDsButton = document.querySelector('#setTemplateIDsButton') as HTMLButtonElement;
  setWalletButton = document.querySelector('#setWalletButton') as HTMLButtonElement;
  shareButton = document.querySelector('#shareButton') as HTMLButtonElement;

  refreshTableButton.addEventListener('click', refresh);
  setTemplateIDsButton.addEventListener('click', setTemplateIDs);
  setWalletButton.addEventListener('click', setWallet);
  shareButton.addEventListener('click', shareTemplateIds);

  const refreshIntervalSpan = document.getElementById('refresh-interval') as HTMLSpanElement;
  refreshIntervalSpan.innerText = Number(settings.getRefreshInterval() / 1000 / 60).toString();

  document.addEventListener('click', deleteRowHandler);

  loadColumnOptions();

  const checkboxes = document.querySelectorAll('input[data-show-column]') as NodeListOf<HTMLInputElement>;
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', applyColumnVisibility);
  });

  applyColumnVisibility();
}

function saveColumnOptions() {
  const checkboxes = document.querySelectorAll('input[data-show-column]') as NodeListOf<HTMLInputElement>;
  const enabled: string[] = [];

  checkboxes.forEach((checkbox) => {
    const columnName = checkbox.dataset.showColumn;
    if (checkbox.checked && columnName !== undefined) {
      enabled.push(columnName);
    }
  });

  settings.setColumnOptions({ enabled });
}

function loadColumnOptions() {
  const options = settings.getColumnOptions();
  options.enabled.forEach((columnName) => {
    const checkbox = document.querySelector(`input[data-show-column=${columnName}]`) as HTMLInputElement;
    checkbox.checked = true;
  });
}

function applyColumnVisibility() {
  const table = document.getElementById('main-table') as HTMLTableElement;

  const checkboxes = document.querySelectorAll('input[data-show-column]') as NodeListOf<HTMLInputElement>;

  checkboxes.forEach((checkbox) => {
    const columnName = checkbox.dataset.showColumn;
    const className = `show-${columnName}`;
    if (checkbox.checked) {
      table.classList.add(className);
    } else {
      table.classList.remove(className);
    }
  });

  saveColumnOptions();
}

(async () => {
  wallet = settings.getWallet();
  templateIds = settings.getTemplateIds();

  display('#noResults', templateIds.length === 0);
  display('#results', templateIds.length > 0);

  // FIXME: Need to figure out why templateIDs initialize to [0] when local storage is not initialized yet
  if (templateIds.length === 1 && Number(templateIds[0]) === 0) {
    templateIds = [];
  }

  bindUI();

  await view.drawTableRows(templateIds, wallet);
  await refresh();
})();
