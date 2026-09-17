import * as cheerio from "cheerio";
import { extractIdentifiers } from "./matching.mjs";

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
  } finally {
    clearTimeout(timer);
  }
}

function walkJsonLd(node, acc=[]){
  if(!node || typeof node !== "object") return acc;
  if(Array.isArray(node)){
    node.forEach(x => walkJsonLd(x, acc));
    return acc;
  }
  const type = node["@type"];
  if(type === "Product" || (Array.isArray(type) && type.includes("Product"))) acc.push(node);
  Object.values(node).forEach(value => {
    if(value && typeof value === "object") walkJsonLd(value, acc);
  });
  return acc;
}

function firstImage(image){
  if(Array.isArray(image)) return image.find(Boolean) || null;
  if(typeof image === "object" && image?.url) return image.url;
  return image || null;
}

export function productsFromJsonLd(html, baseUrl, sourceName){
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

export function dedupeProducts(products){
  const seen = new Set();
  return products.filter(product => {
    const key = `${product.source}|${product.mpn || product.ean || product.gtin || product.sku || product.url}|${product.price}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}
