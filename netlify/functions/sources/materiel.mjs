import * as cheerio from "cheerio";
import { parsePrice, absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";

const BASE="https://www.materiel.net";
const GPU_CATEGORY="https://www.materiel.net/carte-graphique/l426/";

function isGpuQuery(q){ return /\b(?:rtx|gtx|rx|radeon|geforce|arc)\b/i.test(q); }
function matchesQuery(title,q){
  const tokens=q.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(x=>x.length>1);
  const hay=title.toLowerCase();
  return tokens.every(token=>hay.includes(token));
}

function extractCards(html,q){
  const $=cheerio.load(html); const out=[];
  $("a[href*='/produit/']").each((_,a)=>{
    const link=$(a), title=link.text().replace(/\s+/g," ").trim();
    if(!title || !matchesQuery(title,q)) return;
    const card=link.closest("article,li,[class*='product'],[class*='Product'],div");
    const text=card.text().replace(/\s+/g," ");
    const prices=text.match(/\b\d{2,5}(?:[.,]\d{2})?\s*€/g)||[];
    const price=parsePrice(prices.at(-1));
    if(!price) return;
    const image=card.find("img").first().attr("src") || card.find("img").first().attr("data-src");
    out.push({id:absoluteUrl(link.attr("href"),BASE),source:"Materiel.net",title,price,shipping:null,total:price,currency:"EUR",url:absoluteUrl(link.attr("href"),BASE)||BASE,image:absoluteUrl(image,BASE),condition:"NEW",stock:/en stock/i.test(text)?"IN_STOCK":/rupture/i.test(text)?"OUT_OF_STOCK":null,reference:null});
  });
  return dedupeProducts(out);
}

export async function searchMateriel(q){
  const url=isGpuQuery(q) ? GPU_CATEGORY : `https://www.materiel.net/recherche/${encodeURIComponent(q)}.html`;
  const html=await fetchHtml(url,{timeout:12000});
  const json=productsFromJsonLd(html,BASE,"Materiel.net").filter(p=>matchesQuery(p.title,q));
  return dedupeProducts(json.length?json:extractCards(html,q));
}
