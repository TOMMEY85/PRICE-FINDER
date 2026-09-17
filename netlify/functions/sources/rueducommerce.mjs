import * as cheerio from "cheerio";
import { absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";
import { matchesProductQuery } from "./matching.mjs";

const BASE="https://www.rueducommerce.fr";
const GPU_CATEGORY="https://www.rueducommerce.fr/r/70156/carte-graphique/";

function isGpuQuery(q){ return /\b(?:rtx|gtx|rx|radeon|geforce|arc)\b/i.test(q); }

function candidateUrls(html,q){
  const $=cheerio.load(html); const urls=[];
  $("a[href*='/p/']").each((_,a)=>{
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
    const products=productsFromJsonLd(html,url,"Rue du Commerce")
      .filter(p=>matchesProductQuery(p,q));
    if(!products.length) return null;

    // La fiche produit est la seule source de prix autorisée. On ignore
    // volontairement les prix de cartes catégorie (mensualités, remises, etc.).
    const p=products[0];
    return {...p,url:p.url||url,total:p.price,shipping:null,verifiedPrice:true};
  }catch{return null;}
}

export async function searchRueDuCommerce(q){
  const listingUrl=isGpuQuery(q) ? GPU_CATEGORY : `https://www.rueducommerce.fr/r/${encodeURIComponent(q)}`;
  const html=await fetchHtml(listingUrl,{timeout:12000});

  const listingJson=productsFromJsonLd(html,BASE,"Rue du Commerce")
    .filter(p=>matchesProductQuery(p,q));
  const urls=[...new Set([
    ...listingJson.map(p=>p.url).filter(Boolean),
    ...candidateUrls(html,q)
  ])].slice(0,10);

  const checked=await Promise.all(urls.map(url=>verifyProductPage(url,q)));
  return dedupeProducts(checked.filter(Boolean));
}
