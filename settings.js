// List of template IDs of NFTs to monitor
const templateIDs = [348878, 345393, 167345, 140918, 167332, 45017, 329691, 251305, 281655, 166103, 103370, 258614, 145826, 297139, 297137, 285053, 234120].sort()

// Frequency in milliseconds to update the data
const refreshInterval = 5 * 60 * 1000; // 5 minutes

// WAX Wallet address for creating the "inventory" link
const waxAddress = 'mo.xy'