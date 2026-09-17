function openFinderWindow({tabId=null, query=""}={}) {
  const params = new URLSearchParams();
  if (tabId != null) params.set("tabId", String(tabId));
  if (query) params.set("query", query);
  const url = chrome.runtime.getURL(`popup.html?${params.toString()}`);
  chrome.windows.create({
    url,
    type: "popup",
    width: 520,
    height: 720,
    focused: true
  });
}

chrome.action.onClicked.addListener((tab) => {
  openFinderWindow({tabId: tab?.id ?? null});
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "price-finder-selection",
    title: "Comparer avec PRICE FINDER : \"%s\"",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "price-finder-page",
    title: "Comparer cette page avec PRICE FINDER",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "price-finder-selection") {
    openFinderWindow({tabId: tab?.id ?? null, query: info.selectionText || ""});
  }
  if (info.menuItemId === "price-finder-page") {
    openFinderWindow({tabId: tab?.id ?? null});
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "openFinder") {
    openFinderWindow({tabId: sender?.tab?.id ?? null, query: msg.query || ""});
  }
});
