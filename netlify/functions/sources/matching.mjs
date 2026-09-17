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
    product?.title, product?.model, product?.mpn, product?.sku, product?.description,
    product?.interface, product?.formFactor, product?.capacity
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
  if (model.nvme && /\bsata\b/.test(hay) && !/\bnvme\b/.test(hay)) return false;
  return true;
}

function motherboardModel(query) {
  const q = normalize(query);
  if (!/(?:carte mere|motherboard|mainboard|cm)/.test(q)) return null;
  return {
    socket: q.match(/\b(am4|am5|tr5|swrx8|lga\s*\d{4}|1700|1851)\b/)?.[1]?.replace(/\s+/g, "") || null,
    chipset: q.match(/\b(a\d{3}|b\d{3}e?|x\d{3}e?|h\d{3}|z\d{3})\b/)?.[1] || null,
    formFactor: q.match(/\b(e\s*atx|atx|micro\s*atx|matx|mini\s*itx|itx)\b/)?.[1]?.replace(/\s+/g, " ") || null,
    memory: q.match(/\b(ddr[345])\b/)?.[1] || null
  };
}

function motherboardMatches(product, query) {
  const model = motherboardModel(query);
  if (!model) return null;
  const hay = normalize([
    product?.title, product?.model, product?.mpn, product?.description,
    product?.socket, product?.chipset, product?.formFactor, product?.memoryType
  ].filter(Boolean).join(" "));
  if (!/(?:carte mere|motherboard|mainboard)/.test(hay)) return false;
  if (model.socket && !hay.includes(model.socket)) return false;
  if (model.chipset && !hay.includes(model.chipset)) return false;
  if (model.memory && !hay.includes(model.memory)) return false;
  if (model.formFactor) {
    const ff = model.formFactor.replace(/\s+/g, "");
    if (!hay.replace(/\s+/g, "").includes(ff)) return false;
  }
  return true;
}

function ramModel(query) {
  const q = normalize(query);
  if (!/(?:\bram\b|memoire vive|memory kit|dimm)/.test(q)) return null;
  const capacity = q.match(/\b(\d+)\s*(go|gb)\b/)?.[1] ? Number(q.match(/\b(\d+)\s*(go|gb)\b/)[1]) : null;
  const speed = q.match(/\b(?:ddr[345]\s*)?(\d{4,5})\s*(?:mhz|mt\/s)?\b/)?.[1] ? Number(q.match(/\b(?:ddr[345]\s*)?(\d{4,5})\s*(?:mhz|mt\/s)?\b/)[1]) : null;
  return { ddr: q.match(/\bddr[345]\b/)?.[0] || null, capacity, speed, cl: q.match(/\bcl\s*(\d+)\b/)?.[1] ? Number(q.match(/\bcl\s*(\d+)\b/)[1]) : null, kit: q.match(/\b(\d+)\s*x\s*(\d+)\s*(?:go|gb)\b/) || null };
}

function ramMatches(product, query) {
  const model = ramModel(query);
  if (!model) return null;
  const hay = normalize([
    product?.title, product?.model, product?.mpn, product?.description,
    product?.memoryType, product?.capacity, product?.speed, product?.timings
  ].filter(Boolean).join(" "));
  if (!/(?:\bram\b|memoire|memory|dimm|ddr[345])/.test(hay)) return false;
  if (model.ddr && !hay.includes(model.ddr)) return false;
  if (model.capacity != null) {
    const cap = hay.match(/\b(\d+)\s*(?:go|gb)\b/);
    if (!cap || Number(cap[1]) !== model.capacity) return false;
  }
  if (model.speed != null && !new RegExp(`\\b${model.speed}\\b`).test(hay)) return false;
  if (model.cl != null && !new RegExp(`\\bcl\\s*${model.cl}\\b`).test(hay)) return false;
  return true;
}

function powerModel(query) {
  const q = normalize(query);
  if (!/(?:alimentation|psu|power supply|bloc alimentation)/.test(q)) return null;
  return {
    watts: q.match(/\b(\d{3,4})\s*w\b/)?.[1] ? Number(q.match(/\b(\d{3,4})\s*w\b/)[1]) : null,
    certification: q.match(/\b(80\s*plus|80\s*plus\s*(?:white|bronze|silver|gold|platinum|titanium))\b/)?.[0] || null,
    modular: /\b(semi[- ]?modulaire|modulaire|full[- ]?modular|fully modular)\b/.test(q)
  };
}

function powerMatches(product, query) {
  const model = powerModel(query);
  if (!model) return null;
  const hay = normalize([
    product?.title, product?.model, product?.mpn, product?.description,
    product?.wattage, product?.power, product?.certification
  ].filter(Boolean).join(" "));
  if (!/(?:alimentation|power supply|psu|bloc)/.test(hay)) return false;
  if (model.watts != null && !new RegExp(`\\b${model.watts}\\s*w\\b`).test(hay)) return false;
  if (model.certification) {
    const cert = model.certification.replace(/\s+/g, "");
    if (!hay.replace(/\s+/g, "").includes(cert)) return false;
  }
  if (model.modular && !/(?:modulaire|modular)/.test(hay)) return false;
  return true;
}

function cpuModel(query) {
  const q = normalize(query);
  const match = q.match(/\b(?:ryzen|threadripper)\s*([3579])\s*([0-9]{4,5})(?:\s*x3d|\s*x)?\b|\bcore\s*(?:ultra\s*)?([3579])\s*(\d{3,5})(?:\s*[kfk]?f?)?\b/);
  if (!match) return null;
  const text = match[0];
  return { text, family: /ryzen|threadripper/.test(text) ? "amd" : "intel", number: match[2] || match[4] || "", suffix: /x3d/.test(text) ? "x3d" : /\b\d{4,5}\s*x\b/.test(text) ? "x" : null };
}

function cpuMatches(product, query) {
  const model = cpuModel(query);
  if (!model) return null;
  const hay = normalize([product?.title, product?.model, product?.mpn, product?.description].filter(Boolean).join(" "));
  if (model.family === "amd" && !/(?:ryzen|threadripper)/.test(hay)) return false;
  if (model.family === "intel" && !/(?:core|intel)/.test(hay)) return false;
  if (!new RegExp(`\\b${model.number}\\b`).test(hay)) return false;
  if (model.suffix && !hay.includes(model.suffix)) return false;
  return true;
}

function genericComponentModel(query) {
  const q = normalize(query);
  if (/(?:ssd|nvme|rtx|gtx|rx|radeon|geforce|arc)/.test(q)) return "storage-or-gpu";
  if (/(?:carte mere|motherboard|mainboard)/.test(q)) return "motherboard";
  if (/(?:\bram\b|memoire vive|memory kit|dimm|ddr[345])/.test(q)) return "ram";
  if (/(?:alimentation|psu|power supply|bloc alimentation)/.test(q)) return "power";
  if (cpuModel(query)) return "cpu";
  if (/(?:boitier pc|case pc|tour pc|chassis)/.test(q)) return "case";
  if (/(?:watercooling|aio|ventirad|refroidissement cpu|cooler cpu)/.test(q)) return "cooler";
  if (/(?:disque dur|hdd|hard disk)/.test(q)) return "hdd";
  if (/(?:carte reseau|wifi|ethernet|bluetooth|dongle wifi)/.test(q)) return "network";
  return null;
}

function genericComponentMatches(product, query, kind) {
  if (!kind) return null;
  const hay = normalize([
    product?.title, product?.model, product?.mpn, product?.sku, product?.description,
    product?.brand, product?.category, product?.specifications
  ].filter(Boolean).join(" "));
  const checks = {
    case: /(?:boitier|case|chassis|tour)/,
    cooler: /(?:watercooling|aio|ventirad|cooler|refroidissement)/,
    hdd: /(?:disque dur|hdd|hard disk)/,
    network: /(?:carte reseau|wifi|ethernet|bluetooth|dongle)/
  };
  if (checks[kind] && !checks[kind].test(hay)) return false;
  const tokens = queryTokens(query).filter(t => !["pc","pour","avec","de","du","la","le","un","une"].includes(t));
  return tokens.every(token => hay.includes(token) || compact(hay).includes(compact(token)));
}

export function matchesProductQuery(product, query) {
  const title = product?.title || "";
  const gpu = gpuMatches(title, query);
  if (gpu !== null) return gpu;
  const storage = storageMatches(product, query);
  if (storage !== null) return storage;
  const motherboard = motherboardMatches(product, query);
  if (motherboard !== null) return motherboard;
  const ram = ramMatches(product, query);
  if (ram !== null) return ram;
  const power = powerMatches(product, query);
  if (power !== null) return power;
  const cpu = cpuMatches(product, query);
  if (cpu !== null) return cpu;
  const component = genericComponentMatches(product, query, genericComponentModel(query));
  if (component !== null) return component;

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

export function requiresHardwareVerification(query) {
  return Boolean(genericComponentModel(query));
}
