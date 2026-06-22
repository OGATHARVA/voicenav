// Chrome Extension Background Service Worker

// Enable the side panel on clicking the extension toolbar icon
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Error setting side panel behavior:', error));
  }
});

// Function to send accessibility settings to a specific tab
function applyA11yToTab(tabId) {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('tycs-a11y', (result) => {
      if (result && result['tycs-a11y']) {
        const settings = result['tycs-a11y'];
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_A11Y',
          settings
        }).catch(err => {
          // Ignored: Normal if tab is a chrome:// page or content script is not ready
        });
      }
    });
  }
}

// Apply settings when user switches tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  applyA11yToTab(activeInfo.tabId);
});

// Apply settings when a tab finishes loading or updating
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    applyA11yToTab(tabId);
  }
});
