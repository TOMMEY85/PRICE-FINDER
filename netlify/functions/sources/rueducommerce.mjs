import * as cheerio from "cheerio";
import { parsePrice, absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";
import { matchesProductQuery } from "./matching.mjs";

const BASE="https://www.rueducommerce.fr";
const GPU_CATEGORY="https://www.rueducommerce.fr/r/70156/carte-graphique/";

function isGpuQuery(q){ return /\b(?:rtx|gtx|rx|radeon|geforce|arc)\b/i.test(q); }

function extractCards(html,q){
  const $=cheerio.load(html); const out=[];
  $("a[href*='/p/']").each((_,a)=>{
    const link=$(a), title=link.text().replace(/\s+/g," ").trim();
    if(!title || !matchesProductQuery({title},q)) return;
    const card=link.closest("article,li");
    if(!card.length) return;
    const text=card.text().replace(/\s+/g," ");
    const prices=text.match(/\b\d{2,5}(?:[.,]\d{2})?\s*€/g)||[];
    const price=parsePrice(prices[prices.length-1]);
    if(!price) return;
    const imageEl=card.find("img").first();
    const image=imageEl.attr("src") || imageEl.attr("data-src") || imageEl.attr("data-lazy-src");
    const reference=(text.match(/(?:Réf(?:érence)?|SKU|Modèle)\s*[:#]?\s*([A-Z0-9_-]+)/i)||[])[1]||null;
    out.push({
      id:absoluteUrl(link.attr("href"),BASE),source:"Rue du Commerce",title,price,shipping:null,total:price,currency:"EUR",
      url:absoluteUrl(link.attr("href"),BASE)||BASE,image:absoluteUrl(image,BASE),condition:/reconditionn|occasion|seconde vie/i.test(text)?"USED":"NEW",
      stock:/en stock/i.test(text)?"IN_STOCK":/rupture|indisponible/i.test(text)?"OUT_OF_STOCK":null,reference,
      mpn:null,ean:null,gtin:null,sku:reference,brand:null,model:null
    });
  });
  return dedupeProducts(out);
}

export async function searchRueDuCommerce(q){
  const url=isGpuQuery(q) ? GPU_CATEGORY : `https://www.rueducommerce.fr/r/${encodeURIComponent(q)}`;
  const html=await fetchHtml(url,{timeout:12000});
  const json=productsFromJsonLd(html,BASE,"Rue du Commerce").filter(p=>matchesProductQuery(p,q));
  return dedupeProducts(json.length?json:extractCards(html,q));
}
