const KEY_TEMPLATE_IDS = 'templateIDs';
const KEY_WALLET = 'wallet';

const exchangeTable = document.getElementById('exchangeTable');
const refreshTableButton = document.getElementById('refreshTableButton');
const setWalletButton = document.querySelector('#setWalletButton');
const setTemplateIDsButton = document.querySelector('#setTemplateIDsButton');

async function getWAXPrice() {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=WAX&vs_currencies=USD'
    const response = await fetch(url);
    const data = await response.json();
    return data.wax.usd;
}

async function populatePage() {   
    const now = new Date();
    document.getElementById('timestamp').innerText = now.toLocaleTimeString();

    loadWallet();
    loadTemplateIDs();

    const waxPrice = await getWAXPrice();
    document.getElementById("waxPrice").innerText = waxPrice

    if (templateIDs.length === 0) {
      display('noResults', true);
      display('results', false);
      return;
    }

    display('noResults', false);
    display('results', true);

    const results = []

    for (var i = 0; i < templateIDs.length; i++) {
        const templateID = templateIDs[i]
        document.getElementById("refreshStatus").innerText = `retrieving template ${i}/${templateIDs.length}`

        const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales/templates?symbol=WAX&template_id=${templateID}&order=asc&sort=price`;
        const response = await fetch(url);
        const data = await response.json();
        results.push(data)
    }

    // Reset the table
    exchangeTable.innerHTML = '';

    for (data of results) {
        for (const d of data.data) {
            console.log("DATA:", d)

            const precision = d.price.token_precision
            const left = d.price.amount.substring(0, d.price.amount.length - precision)
            const right = d.price.amount.substring(d.price.amount.length - precision)
            const price =  parseFloat(`${left}.${right}`)

            const saleId = d.sale_id
            const collectionName = d.collection_name
            const schemaName = d.assets[0].schema.schema_name
            const cardName = d.assets[0].name
            const templateId = d.assets[0].template.template_id

            const salesLink = `https://wax.atomichub.io/market/history?collection_name=${collectionName}&data:text.name=${cardName}&order=desc&schema_name=${schemaName}&sort=updated&symbol=WAX`
            const saleLink = `https://wax.atomichub.io/market/sale/${saleId}`
            const listingsLink = `https://wax.atomichub.io/market?collection_name=${collectionName}&data:text.name=${cardName}&order=asc&schema_name=${schemaName}&sort=price&symbol=WAX`
            const collectionLink = `https://wax.atomichub.io/explorer/collection/${collectionName}`
            const templateLink = `https://wax.atomichub.io/explorer/template/${collectionName}/${templateId}`
            const inventoryLink = `https://wax.atomichub.io/profile/${waxAddress}?collection_name=${collectionName}&match=${cardName}&order=desc&sort=transferred`

            const output = `
<tr>
    <td><a href="${templateLink}" class="templateId" target="_blank">${templateId}</a></td>
    <td><a href="${collectionLink}" target="_blank" style="color: ${collectionName.toHSL()}">${collectionName}</a> - <span class="cardName">${cardName}</span></td>
    <td>
        <span style="color: orange">${Math.round(price * 100) / 100}</span> WAX
    </td>
    <td>
        $<span  style="color: green">${(price * waxPrice).toFixed(2)}</span>
    </td>
    <td>
        <a href="${saleLink}" target="_blank">buy</a> 
        | <a href="${salesLink}" target="_blank">sales</a> 
        | <a href="${listingsLink}" target="_blank">listings</a>
        | <a href="${inventoryLink}" target="_blank">${waxAddress}</a>
    </td>
</tr>`

            exchangeTable.insertAdjacentHTML('afterbegin', output)
        }
    }

    document.getElementById("refreshStatus").innerText = ""

    setTimeout(populatePage, refreshInterval)
}

function loadWallet() {
  waxAddress = localStorage.getItem(KEY_WALLET);
  setWalletButton.innerText = waxAddress || 'No wallet set';
}

function loadTemplateIDs() {
  const t = localStorage.getItem(KEY_TEMPLATE_IDS);
  if (t) {
    templateIDs = t.split(',').map(x => Number(x)).sort();
    setTemplateIDsButton.innerText = `${templateIDs.length} template IDs`;
  } else {
    setTemplateIDsButton.innerText = 'No template IDs';
  }
}

function setWallet() {
  const wallet = prompt('Enter your wallet address', waxAddress || '');
  if (wallet) {
    localStorage.setItem(KEY_WALLET, wallet);
    loadWallet();
  }
}

function setTemplateIDs() {
  const t = prompt('Enter your templateIDs delimited by commas', templateIDs.join(','));
  if (t) {
    localStorage.setItem(KEY_TEMPLATE_IDS, t);
    populatePage();
  }
}

function display(id, show) {
  document.querySelector(`#${id}`).classList[show ? 'remove' : 'add']('hidden');
}

(async () => {
    await populatePage();
})();

refreshTableButton.addEventListener('click', populatePage);
setWalletButton.addEventListener('click', setWallet);
setTemplateIDsButton.addEventListener('click', setTemplateIDs);
