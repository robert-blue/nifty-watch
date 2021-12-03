var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { FRESH_HOURS, FRESH_HOURS_REFRESH_INTERVAL, HOT_HOURS, HOT_HOURS_REFRESH_INTERVAL, } from './config.js';
import * as settings from './settings.js';
import * as util from './util.js';
import * as data from './data.js';
import * as view from './view.js';
import { display } from './view.js';
import sortable from './vendor/sortable.js';
let wallet = '';
let templateIds = [];
let globalTimeout;
let refreshTableButton;
let setTemplateIDsButton;
let setWalletButton;
let shareButton;
function refreshRow(row, waxPrice) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        row.classList.add('updating');
        const templateId = (_a = row.dataset.templateId) !== null && _a !== void 0 ? _a : '';
        const results = yield Promise.all([
            yield data.getLastSold(templateId, view.setStatus),
            yield data.getFloorListing(templateId, view.setStatus),
        ]);
        const model = data.transform(results[0], results[1], templateId, wallet);
        view.bindRow(row, model, waxPrice);
        row.classList.remove('updating');
        view.sortTable();
        return model;
    });
}
function supplementalRefresh(result) {
    const { templateId } = result;
    const row = util.getTemplateRow(templateId);
    let refreshInterval = 0;
    if (result.lagHours <= HOT_HOURS) {
        refreshInterval = HOT_HOURS_REFRESH_INTERVAL;
    }
    else if (result.lagHours <= FRESH_HOURS) {
        refreshInterval = FRESH_HOURS_REFRESH_INTERVAL;
    }
    else {
        return;
    }
    clearTimeout(row.refreshTimeoutId);
    row.refreshTimeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        const price = yield data.getWAXPrice();
        supplementalRefresh(yield refreshRow(row, price));
        view.sortTable();
    }), refreshInterval);
}
function getTableBody() {
    return document.querySelector('tbody#exchangeTable');
}
function refresh() {
    return __awaiter(this, void 0, void 0, function* () {
        const tBody = getTableBody();
        tBody.classList.add('updating');
        const waxPrice = yield data.getWAXPrice();
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
        const results = yield Promise.all(rows.map((row) => refreshRow(row, waxPrice)));
        results.forEach((result) => supplementalRefresh(result));
        view.sortTable();
        view.setTimestamp();
        view.clearStatus();
        tBody.classList.remove('updating');
        clearTimeout(globalTimeout);
        globalTimeout = setTimeout(refresh, settings.getRefreshInterval());
    });
}
function clearTimeouts(rows) {
    rows.forEach((row) => {
        clearTimeout(row.refreshTimeoutId);
        // eslint-disable-next-line no-param-reassign
        delete row.refreshTimeoutId;
    });
}
function setWallet() {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line no-alert
        const input = prompt('Enter your wallet address', wallet);
        if (input === null) {
            throw new Error('No wallet address provided');
        }
        wallet = input;
        settings.setWallet(wallet);
        yield view.drawTableRows(templateIds, wallet);
        yield refresh();
    });
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
function setTemplateIDs() {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line no-alert
        const newTemplateIds = prompt('Enter your templateIDs delimited by commas', templateIds.join(','));
        if (newTemplateIds === null) {
            return;
        }
        if (newTemplateIds.length > 0) {
            templateIds = settings.setTemplateIds(newTemplateIds);
            setTemplateIDsButtonText();
            cleanParams();
            yield view.drawTableRows(templateIds, wallet);
            yield refresh();
        }
    });
}
function shareTemplateIds() {
    return __awaiter(this, void 0, void 0, function* () {
        const ids = settings.getTemplateIds();
        const link = `https://nftgaze.com/?template_ids=${ids.join(',')}`;
        // eslint-disable-next-line no-alert
        prompt('Here is your sharable link to the current list of template ids', link);
    });
}
function setTemplateIDsButtonText() {
    setTemplateIDsButton.innerText = templateIds.length === 0
        ? 'No template IDs'
        : `${templateIds.length} template IDs`;
}
function deleteRowHandler(e) {
    return __awaiter(this, void 0, void 0, function* () {
        if (e.target === null) {
            return;
        }
        const element = e.target;
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
            cleanParams();
            setTemplateIDsButtonText();
            row.remove();
        }
    });
}
function setWalletButtonText() {
    setWalletButton.innerText = wallet || 'No wallet set';
}
function bindUI() {
    const headerCell = document.querySelector('#main-table th.dir-u, #main-table th.dir-d');
    sortable(headerCell);
    refreshTableButton = document.querySelector('#refreshTableButton');
    setTemplateIDsButton = document.querySelector('#setTemplateIDsButton');
    setWalletButton = document.querySelector('#setWalletButton');
    shareButton = document.querySelector('#shareButton');
    refreshTableButton.addEventListener('click', refresh);
    setTemplateIDsButton.addEventListener('click', setTemplateIDs);
    setWalletButton.addEventListener('click', setWallet);
    shareButton.addEventListener('click', shareTemplateIds);
    const refreshIntervalSpan = document.getElementById('refresh-interval');
    refreshIntervalSpan.innerText = Number(settings.getRefreshInterval() / 1000 / 60).toString();
    document.addEventListener('click', deleteRowHandler);
    loadColumnOptions();
    const checkboxes = document.querySelectorAll('input[data-show-column]');
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', applyColumnVisibility);
    });
    applyColumnVisibility();
}
function saveColumnOptions() {
    const checkboxes = document.querySelectorAll('input[data-show-column]');
    const enabled = [];
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
        const checkbox = document.querySelector(`input[data-show-column=${columnName}]`);
        checkbox.checked = true;
    });
}
function applyColumnVisibility() {
    const table = document.getElementById('main-table');
    const checkboxes = document.querySelectorAll('input[data-show-column]');
    checkboxes.forEach((checkbox) => {
        const columnName = checkbox.dataset.showColumn;
        const className = `show-${columnName}`;
        if (checkbox.checked) {
            table.classList.add(className);
        }
        else {
            table.classList.remove(className);
        }
    });
    saveColumnOptions();
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    wallet = settings.getWallet();
    templateIds = settings.getTemplateIds();
    display('#noResults', templateIds.length === 0);
    display('#results', templateIds.length > 0);
    // FIXME: Need to figure out why templateIDs initialize to [0] when local storage is not initialized yet
    if (templateIds.length === 1 && Number(templateIds[0]) === 0) {
        templateIds = [];
    }
    bindUI();
    yield view.drawTableRows(templateIds, wallet);
    yield refresh();
}))();
//# sourceMappingURL=script.js.map