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

  // Si la recherche contient une marque ou un modèle précis en plus du GPU,
  // ces éléments doivent également être présents dans le produit.
  const baseTokens = new Set([model.family, model.number, model.suffix].filter(Boolean));
  const extras = queryTokens(query).filter(token => !baseTokens.has(token) && !/^\d+(?:gb|go|g)$/.test(token));
  return extras.every(token => hay.includes(token) || compactHay.includes(compact(token)));
}

export function matchesProductQuery(product, query) {
  const title = product?.title || "";
  const gpu = gpuMatches(title, query);
  if (gpu !== null) return gpu;

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
  if (!model) return normalize(query);
  return `${model.family} ${model.number}${model.suffix ? ` ${model.suffix}` : ""}`;
}
