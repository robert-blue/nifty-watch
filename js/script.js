var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DEAD_HOURS_REFRESH_INTERVAL, FIRE_HOURS, FIRE_HOURS_REFRESH_INTERVAL, FRESH_HOURS, FRESH_HOURS_REFRESH_INTERVAL, HOT_HOURS, HOT_HOURS_REFRESH_INTERVAL, } from './config.js';
import * as settings from './settings.js';
import { getQueryStringTemplateIds, getTemplateIds } from './settings.js';
import * as util from './util.js';
import * as data from './data.js';
import * as view from './view.js';
import { bindLinks } from './view.js';
import { get, set } from './storage.js';
import sortable from './vendor/sortable.js';
let templateIds = [];
let refreshTableButton;
let setTemplateIDsButton;
let setWalletButton;
let shareButton;
let cacheLoaded = {};
function refreshRow(row, waxPrice) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        row.classList.add('updating');
        const wallet = settings.getWallet();
        const templateId = (_a = row.dataset.templateId) !== null && _a !== void 0 ? _a : '';
        let lastSold;
        let floorListing;
        if (!cacheLoaded[templateId]) {
            const value = get(templateId);
            if (value !== undefined) {
                ({ lastSold, floorListing } = value);
                cacheLoaded[templateId] = true;
            }
        }
        if (!lastSold || !floorListing) {
            lastSold = yield data.getLastSold(templateId, view.setStatus);
            floorListing = yield data.getFloorListing(templateId, view.setStatus);
            set(templateId, { lastSold, floorListing });
        }
        let model;
        if (lastSold.lastPrice === undefined && floorListing.floorPrice === undefined) {
            const cacheKey = `template-data:${templateId}`;
            let templateData = get(cacheKey);
            if (!templateData || templateData.collectionName === undefined) {
                templateData = yield data.getTemplateData(templateId, view.setStatus);
                set(cacheKey, templateData);
            }
            model = Object.assign({ seller: '', collectionLink: '', floorPrice: undefined, historyLink: '', increasing: 0, inventoryLink: '', lagHours: undefined, lastPrice: undefined, lastSoldDate: new Date(0), listings: [], listingsLink: '', mintNumber: 0, priceHistory: [], schemaLink: '', templateLink: '' }, templateData);
            model = bindLinks(model, templateId, wallet);
        }
        else {
            model = data.transform(lastSold, floorListing, templateId, wallet);
        }
        view.bindRow(row, model, waxPrice, settings.getWallets());
        row.setAttribute('title', `last updated ${(new Date()).toLocaleTimeString()}`);
        view.setTimestamp();
        view.sortTable();
        row.classList.remove('updating');
        return model;
    });
}
function supplementalRefresh(result) {
    const { templateId } = result;
    const row = util.getTemplateRow(templateId);
    let refreshInterval;
    if (result.lagHours === undefined) {
        refreshInterval = FRESH_HOURS_REFRESH_INTERVAL;
    }
    else if (result.lagHours <= FIRE_HOURS) {
        refreshInterval = FIRE_HOURS_REFRESH_INTERVAL;
    }
    else if (result.lagHours <= HOT_HOURS) {
        refreshInterval = HOT_HOURS_REFRESH_INTERVAL;
    }
    else if (result.lagHours <= FRESH_HOURS) {
        refreshInterval = FRESH_HOURS_REFRESH_INTERVAL;
    }
    else {
        refreshInterval = DEAD_HOURS_REFRESH_INTERVAL;
    }
    if (Object.getOwnPropertyNames(row).includes('refreshTimeout')) {
        clearTimeout(row.refreshTimeoutId);
    }
    row.refreshTimeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        const waxPrice = yield data.getWAXPrice();
        view.bindWaxPrice(waxPrice);
        supplementalRefresh(yield refreshRow(row, waxPrice));
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
        view.bindWaxPrice(waxPrice);
        setWalletButtonText();
        setTemplateIDsButtonText();
        view.display('#noResults', templateIds.length === 0);
        view.display('#results', templateIds.length > 0);
        const rows = view.getAssetRows();
        clearTimeouts(rows);
        const results = yield Promise.all(rows.map((row) => refreshRow(row, waxPrice)));
        results.forEach((result) => supplementalRefresh(result));
        view.sortTable();
        view.clearStatus();
        tBody.classList.remove('updating');
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
        util.logEvent('#button/set-wallet', 'set wallet button clicked');
        // eslint-disable-next-line no-alert
        const input = prompt('Enter your wallet address', settings.getWallets().join(','));
        if (input === null) {
            throw new Error('No wallet address provided');
        }
        const wallet = input.trim().replace(' ', '').toLowerCase();
        settings.setWallet(wallet);
        yield view.drawTableRows(templateIds, settings.getWallet());
        cacheLoaded = {};
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
        util.logEvent('#button/set-template-ids', 'set template ids button clicked');
        // eslint-disable-next-line no-alert
        const newTemplateIds = prompt('Enter your templateIDs delimited by commas', templateIds.join(','));
        if (newTemplateIds === null) {
            return;
        }
        if (newTemplateIds.length > 0) {
            templateIds = settings.setTemplateIds(getSelectedPreset(), newTemplateIds);
            setTemplateIDsButtonText();
            cleanParams();
            yield view.drawTableRows(templateIds, settings.getWallet());
            cacheLoaded = {};
            yield refresh();
        }
    });
}
function getPresetSelect() {
    return document.querySelector('#presetSelect');
}
function getSelectedPreset() {
    const presetSelect = getPresetSelect();
    return Number(presetSelect.options[presetSelect.selectedIndex].value);
}
function shareTemplateIds() {
    return __awaiter(this, void 0, void 0, function* () {
        util.logEvent('#button/share-template-ids', 'share template ids button clicked');
        const ids = settings.getTemplateIds(getSelectedPreset());
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
            const templateId = Number(attr);
            // eslint-disable-next-line no-alert
            const doDelete = window.confirm(`Are you sure you want to remove this template (#${templateId})? `);
            if (!doDelete) {
                return;
            }
            const index = templateIds.indexOf(templateId);
            delete templateIds[index];
            templateIds = settings.setTemplateIds(getSelectedPreset(), templateIds);
            cleanParams();
            setTemplateIDsButtonText();
            row.remove();
        }
    });
}
function setWalletButtonText() {
    setWalletButton.innerText = settings.getWallet() || 'No wallet set';
}
function toggleExpand(e) {
    util.logEvent('#button/toggle-expand', 'toggle expand button clicked', 'button event');
    const target = e.target;
    const classes = ['fa-maximize', 'fa-minimize'];
    document.body.classList.remove('maximize');
    if (target.classList.contains(classes[0])) {
        target.classList.remove(classes[0]);
        target.classList.add(classes[1]);
        document.body.classList.add('maximize');
    }
    else {
        target.classList.remove(classes[1]);
        target.classList.add(classes[0]);
    }
}
function refreshHandler() {
    return __awaiter(this, void 0, void 0, function* () {
        util.logEvent('#button/refresh', 'refresh button clicked');
        yield refresh();
    });
}
function bindUI() {
    const headerCell = document.querySelector('#main-table th.dir-u, #main-table th.dir-d');
    sortable(headerCell);
    const expandButton = document.querySelector('#expandButton');
    console.log('expandbutton', expandButton);
    expandButton.addEventListener('click', toggleExpand);
    refreshTableButton = document.querySelector('#refreshTableButton');
    setTemplateIDsButton = document.querySelector('#setTemplateIDsButton');
    setWalletButton = document.querySelector('#setWalletButton');
    shareButton = document.querySelector('#shareButton');
    refreshTableButton.addEventListener('click', refreshHandler);
    setTemplateIDsButton.addEventListener('click', setTemplateIDs);
    setWalletButton.addEventListener('click', setWallet);
    shareButton.addEventListener('click', shareTemplateIds);
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
    settings.setColumnOptions(getSelectedPreset(), { enabled });
}
function loadColumnOptions() {
    const options = settings.getColumnOptions(getSelectedPreset());
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
function handlePresetChange(e) {
    return __awaiter(this, void 0, void 0, function* () {
        util.logEvent('#select/preset', 'preset select changed');
        const select = e.target;
        const preset = Number(select.options[select.selectedIndex].value);
        if (preset > -1) {
            cleanParams();
        }
        cacheLoaded = {};
        templateIds = getTemplateIds(preset);
        yield view.drawTableRows(templateIds, settings.getWallet());
        yield refresh();
    });
}
function bindPresetSelect() {
    const presets = settings.getPresets();
    const presetSelect = document.querySelector('#presetSelect');
    for (let i = 0; i < presets.length; i++) {
        const preset = presets[i];
        const option = new Option(preset.name, preset.id.toString());
        presetSelect.add(option);
    }
    if (getQueryStringTemplateIds().length > 0) {
        presetSelect.add(new Option('Shared View', '-1'));
        presetSelect.selectedIndex = 9;
    }
    else {
        presetSelect.selectedIndex = 0;
    }
    presetSelect.addEventListener('change', handlePresetChange);
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    bindPresetSelect();
    templateIds = settings.getTemplateIds(getSelectedPreset());
    view.display('#noResults', templateIds.length === 0);
    view.display('#results', templateIds.length > 0);
    // FIXME: Need to figure out why templateIDs initialize to [0] when local storage is not initialized yet
    if (templateIds.length === 1 && Number(templateIds[0]) === 0) {
        templateIds = [];
    }
    bindUI();
    yield view.drawTableRows(templateIds, settings.getWallet());
    yield refresh();
}))();
//# sourceMappingURL=script.js.map