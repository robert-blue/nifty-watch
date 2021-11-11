// List of template IDs of NFTs to monitor
let templateIDs = [];

// Frequency in milliseconds to update the data
const refreshInterval = 5 * 60 * 1000; // 5 minutes

// WAX Wallet address for creating the "inventory" link
let waxAddress = '';