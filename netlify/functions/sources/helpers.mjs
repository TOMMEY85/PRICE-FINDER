import * as cheerio from "cheerio";
import { extractIdentifiers, matchesProductQuery } from "./matching.mjs";

export function parsePrice(value){
  if(value == null) return null;
  const raw = String(value).replace(/\u00a0/g," ").trim();
  const cleaned = raw.replace(/[^\d,.\-]/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function absoluteUrl(value, base){
  if(!value) return null;
  try { return new URL(value, base).toString(); } catch { return null; }
}

export async function fetchHtml(url, {timeout=10000, userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"}={}){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
        "Cache-Control": "no-cache"
      }
    });
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally { clearTimeout(timer); }
}

function walkJsonLd(node, acc=[]){
  if(!node || typeof node !== "object") return acc;
  if(Array.isArray(node)){ node.forEach(x => walkJsonLd(x, acc)); return acc; }
  const type = node["@type"];
  if(type === "Product" || (Array.isArray(type) && type.includes("Product"))) acc.push(node);
  Object.values(node).forEach(value => { if(value && typeof value === "object") walkJsonLd(value, acc); });
  return acc;
}

function firstImage(image){
  if(Array.isArray(image)) return image.find(Boolean) || null;
  if(typeof image === "object" && image?.url) return image.url;
  return image || null;
}

function jsonLdProducts(html, baseUrl, sourceName){
  const $ = cheerio.load(html);
  const products = [];
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      for(const p of walkJsonLd(data)){
        const offers = Array.isArray(p.offers) ? p.offers[0] : p.offers;
        const price = parsePrice(offers?.price ?? offers?.lowPrice);
        if(!p.name || !price) continue;
        const identifiers = extractIdentifiers(p);
        products.push({
          id: String(identifiers.mpn || identifiers.ean || identifiers.gtin || identifiers.sku || p.url || p.name),
          source: sourceName,
          title: String(p.name).trim(),
          description: p.description || null,
          price,
          shipping: null,
          total: price,
          currency: offers?.priceCurrency || "EUR",
          url: absoluteUrl(offers?.url || p.url, baseUrl) || baseUrl,
          image: absoluteUrl(firstImage(p.image), baseUrl),
          condition: String(offers?.itemCondition || "").toLowerCase().includes("used") ? "USED" : "NEW",
          stock: offers?.availability || null,
          reference: identifiers.mpn || identifiers.sku || identifiers.ean || identifiers.gtin || null,
          mpn: identifiers.mpn,
          ean: identifiers.ean,
          gtin: identifiers.gtin,
          sku: identifiers.sku,
          brand: identifiers.brand,
          model: identifiers.model
        });
      }
    } catch {}
  });
  return products;
}

export function productsFromJsonLd(html, baseUrl, sourceName){
  return jsonLdProducts(html, baseUrl, sourceName);
}

function productFromDetailHtml(html, baseUrl, sourceName, query){
  const structured = jsonLdProducts(html, baseUrl, sourceName).find(product => matchesProductQuery(product, query));
  if(structured) return structured;

  const $ = cheerio.load(html);
  const title = $("h1").first().text().replace(/\s+/g," ").trim() || $("meta[property='og:title']").attr("content") || "";
  const amount = $("meta[property='product:price:amount'],meta[itemprop='price']").first().attr("content") || $("[itemprop='price']").first().text();
  const price = parsePrice(amount);
  if(!title || !price || !matchesProductQuery({title}, query)) return null;
  const image = $("meta[property='og:image']").attr("content") || $("img").first().attr("src");
  return {
    id: baseUrl,
    source: sourceName,
    title,
    price,
    shipping: null,
    total: price,
    currency: "EUR",
    url: baseUrl,
    image: absoluteUrl(image, baseUrl),
    condition: "NEW",
    stock: null,
    reference: null,
    mpn: null,
    ean: null,
    gtin: null,
    sku: null,
    brand: null,
    model: null
  };
}

export async function verifyProductPage(product, query, {timeout=10000}={}){
  if(!product?.url) return null;
  const html = await fetchHtml(product.url, {timeout});
  const verified = productFromDetailHtml(html, product.url, product.source, query);
  if(!verified) return null;
  return {
    ...product,
    ...verified,
    id: product.id || verified.id,
    url: product.url,
    verified: true,
    verification: "product-page"
  };
}

export async function verifyProducts(products, query, {limit=12}={}){
  const candidates = dedupeProducts(products).slice(0, limit);
  const checked = await Promise.allSettled(candidates.map(product => verifyProductPage(product, query)));
  return dedupeProducts(checked.map(result => result.status === "fulfilled" ? result.value : null).filter(Boolean));
}

export function dedupeProducts(products){
  const seen = new Set();
  return products.filter(product => {
    if(!product) return false;
    const key = `${product.source}|${product.mpn || product.ean || product.gtin || product.sku || product.url}|${product.price}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}
