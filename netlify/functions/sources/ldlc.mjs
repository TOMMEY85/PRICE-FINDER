import * as cheerio from "cheerio";
import { fetchHtml, parsePrice, absoluteUrl, productsFromJsonLd, dedupeProducts } from "./helpers.mjs";

const BASE = "https://www.ldlc.com";

export async function searchLDLC(query){
  const url = `${BASE}/recherche/${encodeURIComponent(query)}/`;
  const html = await fetchHtml(url);
  const jsonLd = productsFromJsonLd(html, BASE, "LDLC.COM");
  if(jsonLd.length) return dedupeProducts(jsonLd);

  const $ = cheerio.load(html);
  const products = [];
  $("a[href*='/fiche/']").each((_, link) => {
    const a = $(link);
    const href = absoluteUrl(a.attr("href"), BASE);
    const card = a.closest("article,li,.pdt-item,.product-item,.product-card,div");
    const title = a.find("h2,h3,.title,.pdt-item__title").first().text().trim() || a.text().replace(/\s+/g," ").trim();
    const text = card.text().replace(/\s+/g," ");
    const price = parsePrice(card.find(".price,[class*='price']").first().text()) || parsePrice(text.match(/\d[\d\s,.]*€/)?.[0]);
    if(!title || !price || !href) return;
    const image = absoluteUrl(card.find("img").first().attr("src") || card.find("img").first().attr("data-src"), BASE);
    const stock = /en stock|dispo web/i.test(text) ? "IN_STOCK" : /rupture|indisponible/i.test(text) ? "OUT_OF_STOCK" : null;
    const reference = href.match(/PB\d+/i)?.[0] || null;
    products.push({id:reference || href,source:"LDLC.COM",title,price,shipping:null,total:price,currency:"EUR",url:href,image,condition:"NEW",stock,reference});
  });
  return dedupeProducts(products);
}
