import * as cheerio from "cheerio";
import { absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";
import { matchesProductQuery } from "./matching.mjs";

const BASE="https://www.materiel.net";
const GPU_CATEGORY="https://www.materiel.net/carte-graphique/l426/";

function isGpuQuery(q){ return /\b(?:rtx|gtx|rx|radeon|geforce|arc)\b/i.test(q); }

function candidateUrls(html,q){
  const $=cheerio.load(html); const urls=[];
  $("a[href*='/produit/']").each((_,a)=>{
    const link=$(a);
    const title=link.text().replace(/\s+/g," ").trim();
    if(!title || !matchesProductQuery({title},q)) return;
    const url=absoluteUrl(link.attr("href"),BASE);
    if(url && !urls.includes(url)) urls.push(url);
  });
  return urls.slice(0,10);
}

async function verifyProductPage(url,q){
  try{
    const html=await fetchHtml(url,{timeout:12000});
    const products=productsFromJsonLd(html,url,"Materiel.net")
      .filter(p=>matchesProductQuery(p,q));
    if(!products.length) return null;
    const p=products[0];
    return {...p,url:p.url||url,total:p.price,shipping:null,verifiedPrice:true};
  }catch{return null;}
}

export async function searchMateriel(q){
  const listingUrl=isGpuQuery(q) ? GPU_CATEGORY : `https://www.materiel.net/recherche/${encodeURIComponent(q)}.html`;
  const html=await fetchHtml(listingUrl,{timeout:12000});

  const listingJson=productsFromJsonLd(html,BASE,"Materiel.net")
    .filter(p=>matchesProductQuery(p,q));
  const urls=[...new Set([
    ...listingJson.map(p=>p.url).filter(Boolean),
    ...candidateUrls(html,q)
  ])].slice(0,10);

  const checked=await Promise.all(urls.map(url=>verifyProductPage(url,q)));
  return dedupeProducts(checked.filter(Boolean));
}
