import * as cheerio from "cheerio";
import { parsePrice, absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";

const BASE = "https://www.grosbill.com";
const GPU_CATEGORY = "https://www.grosbill.com/carte-graphique-6.aspx";

function isGpuQuery(q){ return /\b(?:rtx|gtx|rx|radeon|geforce|arc)\b/i.test(q); }
function matchesQuery(title, q){
  const tokens = q.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(x => x.length > 1);
  const hay = title.toLowerCase();
  return tokens.every(token => hay.includes(token));
}

function extractCards(html, q){
  const $ = cheerio.load(html); const out=[];
  $("a[href*='.aspx']").each((_,a)=>{
    const link=$(a), title=link.text().replace(/\s+/g," ").trim();
    if(!title || !matchesQuery(title,q)) return;
    const card=link.closest("article,li,[class*='product'],[class*='Product'],div");
    const text=card.text().replace(/\s+/g," ");
    const price=parsePrice((text.match(/\b\d{2,5}(?:[.,]\d{2})?\s*€/g)||[]).at(-1));
    if(!price) return;
    const image=card.find("img").first().attr("src") || card.find("img").first().attr("data-src");
    out.push({id:absoluteUrl(link.attr("href"),BASE),source:"Grosbill",title,price,shipping:null,total:price,currency:"EUR",url:absoluteUrl(link.attr("href"),BASE)||BASE,image:absoluteUrl(image,BASE),condition:"NEW",stock:/en stock/i.test(text)?"IN_STOCK":null,reference:(text.match(/Réf\s*:\s*([A-Z0-9_-]+)/i)||[])[1]||null});
  });
  return dedupeProducts(out);
}

export async function searchGrosbill(q){
  const url=isGpuQuery(q) ? GPU_CATEGORY : `https://www.grosbill.com/recherche?q=${encodeURIComponent(q)}`;
  const html=await fetchHtml(url,{timeout:12000});
  const json=productsFromJsonLd(html,BASE,"Grosbill").filter(p=>matchesQuery(p.title,q));
  return dedupeProducts(json.length ? json : extractCards(html,q));
}
