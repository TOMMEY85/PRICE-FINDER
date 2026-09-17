import * as cheerio from "cheerio";
import { absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";
import { matchesProductQuery } from "./matching.mjs";

const BASE="https://www.rueducommerce.fr";
const GPU_CATEGORY="https://www.rueducommerce.fr/r/70156/carte-graphique/";
const SSD_NVME_CATEGORY="https://www.rueducommerce.fr/r/70159/ssd/%2Bfc2456-1/";

function isGpuQuery(q){ return /\b(?:rtx|gtx|rx|radeon|geforce|arc)\b/i.test(q); }
function isStorageQuery(q){ return /\bssd\b/i.test(q); }

function candidateUrls(html,q){
  const $=cheerio.load(html); const urls=[];
  $("a[href*='/p/']").each((_,a)=>{
    const link=$(a); const title=link.text().replace(/\s+/g," ").trim();
    if(!title || !matchesProductQuery({title},q)) return;
    const url=absoluteUrl(link.attr("href"),BASE);
    if(url && !urls.includes(url)) urls.push(url);
  });
  return urls.slice(0,12);
}

async function verifyProductPage(url,q){
  try{
    const html=await fetchHtml(url,{timeout:12000});
    const products=productsFromJsonLd(html,url,"Rue du Commerce").filter(p=>matchesProductQuery(p,q));
    if(!products.length) return null;
    const p=products[0];
    return {...p,url:p.url||url,total:p.price,shipping:null,verifiedPrice:true,verification:"product-page"};
  }catch{return null;}
}

export async function searchRueDuCommerce(q){
  let listingUrl;
  if(isGpuQuery(q)) listingUrl=GPU_CATEGORY;
  else if(isStorageQuery(q) && /\bnvme\b/i.test(q)) listingUrl=SSD_NVME_CATEGORY;
  else listingUrl=`https://www.rueducommerce.fr/r/${encodeURIComponent(q)}`;

  const html=await fetchHtml(listingUrl,{timeout:12000});
  const listingJson=productsFromJsonLd(html,BASE,"Rue du Commerce").filter(p=>matchesProductQuery(p,q));
  const urls=[...new Set([...listingJson.map(p=>p.url).filter(Boolean),...candidateUrls(html,q)])].slice(0,12);
  const checked=await Promise.all(urls.map(url=>verifyProductPage(url,q)));
  return dedupeProducts(checked.filter(Boolean));
}
