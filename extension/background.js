const openFinder = (query) => {
  const q = (query || '').trim();
  if (!q) return;
  chrome.tabs.create({ url: `http://127.0.0.1:8765/?q=${encodeURIComponent(q)}` });
};
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id:'price-finder-selection', title:'Comparer avec PRICE FINDER : "%s"', contexts:['selection'] });
  chrome.contextMenus.create({ id:'price-finder-page', title:'Comparer cette page avec PRICE FINDER', contexts:['page'] });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'price-finder-selection') openFinder(info.selectionText);
  if (info.menuItemId === 'price-finder-page') openFinder(info.selectionText || tab?.title || '');
});
chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === 'openFinder') openFinder(msg.query); });
