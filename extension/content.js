(() => {
  const keywords = /(rtx|gtx|radeon|rx \d|ryzen|core i[3579]|core ultra|geforce|arc a\d|ssd|nvme|ddr[45]|ram|mémoire|carte graphique|processeur|cpu|gpu|alimentation|carte mère|motherboard|boîtier|watercooling|aio|ventirad|disque dur|hdd|wifi|ethernet)/i;
  const pageText = `${document.title} ${location.href} ${document.querySelector('h1')?.innerText || ''}`;

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function detectProduct() {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '{}');
        const nodes = Array.isArray(data) ? data : [data, ...(data['@graph'] || [])];
        const product = nodes.find(x => x && (x['@type'] === 'Product' || (Array.isArray(x['@type']) && x['@type'].includes('Product'))));
        if (product?.name) {
          return {
            title: clean(product.name),
            brand: typeof product.brand === 'object' ? product.brand?.name : product.brand,
            model: product.model,
            mpn: product.mpn || product.manufacturerPartNumber,
            sku: product.sku,
            url: location.href
          };
        }
      } catch {}
    }

    const title = clean(
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('h1')?.innerText ||
      document.title
    );
    return title ? {title, url: location.href} : null;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type !== 'getPageProduct') return;
    const product = detectProduct();
    sendResponse({product, relevant: keywords.test(pageText)});
    return true;
  });

  let last = '';
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection()?.toString().trim();
    if (!selection || selection === last || selection.length > 120) return;
    last = selection;
    const old = document.getElementById('pf-finder-btn');
    if (old) old.remove();
    const btn = document.createElement('button');
    btn.id = 'pf-finder-btn';
    btn.textContent = '🔎 Comparer avec PRICE FINDER';
    Object.assign(btn.style, {
      position:'fixed', zIndex:2147483647, right:'18px', bottom:'18px',
      padding:'11px 14px', border:'0', borderRadius:'10px',
      background:'#e50914', color:'#fff', fontWeight:'700',
      boxShadow:'0 5px 25px #0008', cursor:'pointer'
    });
    btn.onclick = () => chrome.runtime.sendMessage({type:'openFinder', query:selection});
    document.body.appendChild(btn);
    setTimeout(() => btn.remove(), 8000);
  });
})();
