// List of template IDs of NFTs to monitor
let templateIds = [];

// WAX Wallet address for creating the "inventory" link
let waxAddress = '';

// Frequency in milliseconds to update the data
const refreshInterval = 5 * 60 * 1000; // 5 minutes

const HOT_HOURS = 2;
const FRESH_HOURS = 16;
const DEAD_HOURS = 5 * 24;
