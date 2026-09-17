import * as cheerio from "cheerio";
import { fetchHtml, parsePrice, absoluteUrl, productsFromJsonLd, dedupeProducts } from "./helpers.mjs";

const BASE = "https://www.cybertek.fr";

export async function searchCybertek(query){
  const url = `${BASE}/boutique/produit.aspx?q=${encodeURIComponent(query).replace(/%20/g,"+")}`;
  const html = await fetchHtml(url);
  const jsonLd = productsFromJsonLd(html, BASE, "Cybertek");
  if(jsonLd.length) return dedupeProducts(jsonLd);

  const $ = cheerio.load(html);
  const products = [];
  $("a[href*='/produit.aspx']").each((_, link) => {
    const a = $(link);
    const href = absoluteUrl(a.attr("href"), BASE);
    const card = a.closest("article,li,.product,.product-item,.product-card,div");
    const title = a.find("h2,h3,.product-title,.name").first().text().trim() || a.text().replace(/\s+/g," ").trim();
    const text = card.text().replace(/\s+/g," ");
    const price = parsePrice(card.find(".price,[class*='price']").first().text()) || parsePrice(text.match(/\d[\d\s,.]*€/)?.[0]);
    if(!title || !price || !href) return;
    const image = absoluteUrl(card.find("img").first().attr("src") || card.find("img").first().attr("data-src"), BASE);
    const reference = text.match(/Réf\s*:\s*([A-Z0-9_-]+)/i)?.[1] || null;
    const stock = /dispo web\s*:\s*(en stock|disponible)/i.test(text) ? "IN_STOCK" : /indisponible/i.test(text) ? "OUT_OF_STOCK" : null;
    products.push({id:reference || href,source:"Cybertek",title,price,shipping:null,total:price,currency:"EUR",url:href,image,condition:"NEW",stock,reference});
  });
  return dedupeProducts(products);
}
