function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value = "") { return normalize(value).replace(/\s+/g, ""); }
function queryTokens(query) { return normalize(query).split(" ").filter(token => token.length > 1); }

function gpuModel(query) {
  const q = normalize(query);
  const match = q.match(/\b(?:rtx|gtx|rx|arc)\s*(\d{3,4})(?:\s*(ti|xt|xtx|super))?\b/);
  if (!match) return null;
  return { family: match[0].split(" ")[0], number: match[1], suffix: match[2] || "" };
}

function gpuMatches(title, query) {
  const model = gpuModel(query);
  if (!model) return null;
  const hay = normalize(title);
  const compactHay = compact(title);
  const familyOk = model.family === "rx" ? /\b(?:rx|radeon)\b/.test(hay) : hay.includes(model.family);
  if (!familyOk) return false;
  if (!(new RegExp(`\\b${model.number}\\b`).test(hay) || compactHay.includes(model.number))) return false;
  if (model.suffix && !(new RegExp(`\\b${model.suffix}\\b`).test(hay) || compactHay.includes(`${model.number}${model.suffix}`))) return false;
  const baseTokens = new Set([model.family, model.number, model.suffix].filter(Boolean));
  const extras = queryTokens(query).filter(token => !baseTokens.has(token) && !/^\d+(?:gb|go|g)$/.test(token));
  return extras.every(token => hay.includes(token) || compactHay.includes(compact(token)));
}

function storageModel(query) {
  const q = normalize(query);
  if (!/\bssd\b/.test(q)) return null;
  const capacity = q.match(/\b(\d+(?:[.,]\d+)?)\s*(to|tb|go|gb)\b/);
  return {
    capacity: capacity ? Number(capacity[1].replace(",", ".")) * (/go|gb/.test(capacity[2]) ? 1 / 1024 : 1) : null,
    nvme: /\bnvme\b/.test(q),
    m2: /\bm\s*2\b|\bm2\b/.test(q)
  };
}

function storageMatches(product, query) {
  const model = storageModel(query);
  if (!model) return null;
  const hay = normalize([
    product?.title,
    product?.model,
    product?.mpn,
    product?.sku,
    product?.description,
    product?.interface,
    product?.formFactor,
    product?.capacity
  ].filter(Boolean).join(" "));
  if (!/\bssd\b/.test(hay)) return false;
  if (model.nvme && !/\bnvme\b/.test(hay)) return false;
  if (model.m2 && !/(?:\bm\s*2\b|\bm2\b)/.test(hay)) return false;
  if (model.capacity != null) {
    const tb = hay.match(/\b(\d+(?:[.,]\d+)?)\s*(?:to|tb)\b/);
    const gb = hay.match(/\b(\d{3,5})\s*(?:go|gb)\b/);
    const detected = tb ? Number(tb[1].replace(",", ".")) : gb ? Number(gb[1]) / 1024 : null;
    if (detected == null || Math.abs(detected - model.capacity) > 0.05) return false;
  }
  // A query explicitly asking for NVMe must never return SATA/AHCI-only products.
  if (model.nvme && /\bsata\b/.test(hay) && !/\bnvme\b/.test(hay)) return false;
  return true;
}

export function matchesProductQuery(product, query) {
  const title = product?.title || "";
  const gpu = gpuMatches(title, query);
  if (gpu !== null) return gpu;
  const storage = storageMatches(product, query);
  if (storage !== null) return storage;

  const normalizedTitle = normalize([
    title, product?.brand, product?.model, product?.mpn,
    product?.ean, product?.gtin, product?.sku
  ].filter(Boolean).join(" "));
  const compactTitle = compact(normalizedTitle);
  const tokens = queryTokens(query);
  if (!tokens.length) return false;
  return tokens.every(token => normalizedTitle.includes(token) || compactTitle.includes(compact(token)));
}

export function extractIdentifiers(product = {}) {
  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const identifier = typeof product.identifier === "object" ? product.identifier?.value : product.identifier;
  const gtin = product.gtin13 || product.gtin12 || product.gtin14 || product.gtin || product.isbn || null;
  return {
    brand: typeof product.brand === "object" ? product.brand?.name : product.brand || null,
    model: product.model || null,
    mpn: product.mpn || product.manufacturerPartNumber || null,
    ean: gtin || (identifier && /^\d{8,14}$/.test(String(identifier)) ? String(identifier) : null),
    gtin: gtin || null,
    sku: product.sku || offers?.sku || null
  };
}

export function queryFingerprint(query) {
  const model = gpuModel(query);
  if (model) return `${model.family} ${model.number}${model.suffix ? ` ${model.suffix}` : ""}`;
  const storage = storageModel(query);
  if (storage) return `${storage.nvme ? "ssd nvme" : "ssd"}${storage.capacity != null ? ` ${storage.capacity}to` : ""}`;
  return normalize(query);
}
