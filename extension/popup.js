const q = document.getElementById('q');
const go = document.getElementById('go');
const status = document.getElementById('status');
const results = document.getElementById('results');
const params = new URLSearchParams(location.search);
let tabId = Number(params.get('tabId')) || null;
const forcedQuery = params.get('query') || '';

function esc(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function formatPrice(value) {
  return Number(value).toLocaleString('fr-FR', {style:'currency', currency:'EUR'});
}

async function getActiveTabId() {
  if (tabId) return tabId;
  try {
    const tabs = await chrome.tabs.query({active:true, currentWindow:true});
    tabId = tabs?.[0]?.id || null;
  } catch {}
  return tabId;
}

async function detectPageProduct() {
  if (forcedQuery) return forcedQuery;
  const activeTabId = await getActiveTabId();
  if (!activeTabId) return '';
  try {
    const response = await chrome.tabs.sendMessage(activeTabId, {type:'getPageProduct'});
    const product = response?.product;
    if (!product) return '';
    return [product.brand, product.model, product.mpn, product.title].filter(Boolean).join(' ').slice(0,180);
  } catch {
    return '';
  }
}

async function search(query) {
  const value = query.trim();
  if (!value) {
    status.textContent = 'Aucun produit détecté — saisis une recherche.';
    results.innerHTML = '<div class="empty">Impossible d’identifier automatiquement le produit de cette page.</div>';
    return;
  }
  q.value = value;
  go.disabled = true;
  status.textContent = `Recherche de « ${value} » chez les revendeurs…`;
  results.innerHTML = '<div class="empty">Vérification des fiches produits…</div>';
  try {
    const response = await fetch(`https://price-finder.netlify.app/api/search?q=${encodeURIComponent(value)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    status.textContent = `${items.length} offre(s) vérifiée(s) pour « ${data.query || value} »`;
    if (!items.length) {
      results.innerHTML = '<div class="empty">Aucune offre vérifiée trouvée.<div class="small">Les prix non vérifiés ne sont volontairement pas affichés pour les composants PC.</div></div>';
      return;
    }
    results.innerHTML = items.slice(0,12).map((item,index) => `
      <article class="product ${index===0?'best':''}">
        ${item.image ? `<img class="thumb" src="${esc(item.image)}" alt="">` : '<div class="thumb"></div>'}
        <div class="info">
          ${index===0 ? '<div class="badge">MEILLEUR PRIX VÉRIFIÉ</div>' : ''}
          <div class="title">${esc(item.title)}</div>
          <div class="meta"><span class="source">${esc(item.source)}</span>${item.stock ? ` · ${esc(String(item.stock).replace(/^https?:.*#/,''))}` : ''}</div>
          <div class="price">${formatPrice(item.price)}</div>
          <div class="verified">✓ Prix vérifié sur la fiche produit</div>
          ${item.url ? `<a class="open" href="${esc(item.url)}" target="_blank">Voir le produit ↗</a>` : ''}
        </div>
      </article>`).join('');
  } catch (error) {
    status.textContent = 'Erreur de connexion à PRICE FINDER';
    results.innerHTML = `<div class="empty">La comparaison n’a pas pu être chargée.<div class="small">${esc(error.message || 'Erreur inconnue')}</div></div>`;
  } finally {
    go.disabled = false;
  }
}

go.addEventListener('click', () => search(q.value));
q.addEventListener('keydown', event => { if (event.key === 'Enter') search(q.value); });

(async () => {
  const detected = await detectPageProduct();
  if (detected) await search(detected);
  else {
    status.textContent = 'Recherche manuelle';
    results.innerHTML = '<div class="empty">Ouvre une fiche produit puis clique sur PRICE FINDER pour lancer la comparaison automatique.</div>';
  }
})();
