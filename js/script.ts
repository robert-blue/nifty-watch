import {
  DEAD_HOURS_REFRESH_INTERVAL,
  FIRE_HOURS,
  FIRE_HOURS_REFRESH_INTERVAL,
  FRESH_HOURS,
  FRESH_HOURS_REFRESH_INTERVAL,
  HOT_HOURS,
  HOT_HOURS_REFRESH_INTERVAL,
} from './config.js';
import * as settings from './settings.js';
import * as util from './util.js';
import * as data from './data.js';
import * as view from './view.js';
import {
  // eslint-disable-next-line import/named
  AtomicAsset, AtomicListing, AtomicSale, RowView, TemplateRow,
} from './types.js';
import { get, set } from './storage.js';

import sortable from './vendor/sortable.js';
import { bindLinks } from './view.js';

let wallet = '';
let templateIds: string[] = [];

let refreshTableButton: HTMLButtonElement;
let setTemplateIDsButton: HTMLButtonElement;
let setWalletButton: HTMLButtonElement;
let shareButton: HTMLButtonElement;

interface cacheData {
  lastSold: AtomicSale
  floorListing: AtomicListing
}

let cacheLoaded: { [templateId: string]: boolean } = {};

async function refreshRow(row: HTMLTableRowElement, waxPrice: number) {
  row.classList.add('updating');

  const templateId = row.dataset.templateId ?? '';

  let lastSold: AtomicSale | undefined;
  let floorListing: AtomicListing | undefined;

  if (!cacheLoaded[templateId]) {
    const value = get<cacheData>(templateId);
    if (value !== undefined) {
      ({ lastSold, floorListing } = value);
      cacheLoaded[templateId] = true;
    }
  }

  if (!lastSold || !floorListing) {
    lastSold = await data.getLastSold(templateId, view.setStatus);
    floorListing = await data.getFloorListing(templateId, view.setStatus);
    set<cacheData>(templateId, { lastSold, floorListing });
  }

  let model: RowView;

  if (lastSold.lastPrice === undefined && floorListing.floorPrice === undefined) {
    const cacheKey = `template-data:${templateId}`;
    let templateData = get<AtomicAsset>(cacheKey);
    if (!templateData || templateData.collectionName === undefined) {
      templateData = await data.getTemplateData(templateId, view.setStatus);
      set<AtomicAsset>(cacheKey, templateData);
    }

    model = {
      collectionLink: '',
      floorPrice: undefined,
      historyLink: '',
      increasing: 0,
      inventoryLink: '',
      lagHours: undefined,
      lastPrice: undefined,
      lastSoldDate: new Date(0),
      listingsLink: '',
      mintNumber: 0,
      schemaLink: '',
      templateLink: '',
      ...templateData,
    };
    model = bindLinks(model, templateId, wallet);
  } else {
    model = data.transform(lastSold, floorListing, templateId, wallet);
  }

  view.bindRow(row, model, waxPrice);
  row.setAttribute('title', `last updated ${(new Date()).toLocaleTimeString()}`);
  view.setTimestamp();
  view.sortTable();
  row.classList.remove('updating');

  return model;
}

function supplementalRefresh(result: RowView) {
  const { templateId } = result;
  const row = util.getTemplateRow(templateId);

  let refreshInterval;

  if (result.lagHours === undefined) {
    refreshInterval = FRESH_HOURS_REFRESH_INTERVAL;
  } else if (result.lagHours <= FIRE_HOURS) {
    refreshInterval = FIRE_HOURS_REFRESH_INTERVAL;
  } else if (result.lagHours <= HOT_HOURS) {
    refreshInterval = HOT_HOURS_REFRESH_INTERVAL;
  } else if (result.lagHours <= FRESH_HOURS) {
    refreshInterval = FRESH_HOURS_REFRESH_INTERVAL;
  } else {
    refreshInterval = DEAD_HOURS_REFRESH_INTERVAL;
  }

  if ('refreshTimeout' in row) {
    clearTimeout(row.refreshTimeoutId);
  }

  row.refreshTimeoutId = setTimeout(async () => {
    const waxPrice = await data.getWAXPrice();
    view.bindWaxPrice(waxPrice);
    supplementalRefresh(await refreshRow(row, waxPrice));
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
  view.bindWaxPrice(waxPrice);

  setWalletButtonText();
  setTemplateIDsButtonText();
  view.display('#noResults', templateIds.length === 0);
  view.display('#results', templateIds.length > 0);

  const rows = view.getAssetRows();
  clearTimeouts(rows);

  const results = await Promise.all(rows.map((row) => refreshRow(row, waxPrice)));
  results.forEach((result) => supplementalRefresh(result));

  view.sortTable();
  view.clearStatus();

  tBody.classList.remove('updating');
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
  cacheLoaded = {};
  await refresh();
}

function cleanParams() {
  const urlParams = new URLSearchParams(document.location.search);
  urlParams.delete('template_ids');
  const url = document.location;
  const newUrl = `${url.origin}${url.pathname}${urlParams.toString()}`;
  if (window.history.pushState) {
    window.history.pushState({}, '', newUrl);
  }
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
    cleanParams();

    await view.drawTableRows(templateIds, wallet);
    cacheLoaded = {};
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

    // eslint-disable-next-line no-alert
    const doDelete = window.confirm(`Are you sure you want to remove this template (#${templateId})? `);
    if (!doDelete) {
      return;
    }

    const index = templateIds.indexOf(templateId);
    delete templateIds[index];
    templateIds = settings.setTemplateIds(templateIds);
    cleanParams();
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

  view.display('#noResults', templateIds.length === 0);
  view.display('#results', templateIds.length > 0);

  // FIXME: Need to figure out why templateIDs initialize to [0] when local storage is not initialized yet
  if (templateIds.length === 1 && Number(templateIds[0]) === 0) {
    templateIds = [];
  }

  bindUI();

  await view.drawTableRows(templateIds, wallet);
  await refresh();
})();
