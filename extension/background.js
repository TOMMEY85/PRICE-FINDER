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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const query = info.menuItemId === "price-finder-selection" ? (info.selectionText || "") : "";
  try {
    await chrome.tabs.sendMessage(tab.id, {type: "openFinderOverlay", query});
  } catch {
    // Some protected browser pages do not allow content scripts.
  }
});
