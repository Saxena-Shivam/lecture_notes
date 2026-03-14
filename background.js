// Background service worker — Manifest V3

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Initialize empty screenshot list on fresh install
    chrome.storage.local.set({ screenshots: [] });
    console.log("Lecture Screenshot to PDF installed.");
  }
});
