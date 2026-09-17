import * as cheerio from "cheerio";
import { absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";
import { matchesProductQuery } from "./matching.mjs";

const BASE = "https://www.grosbill.com";
const GPU_CATEGORY = "https://www.grosbill.com/carte-graphique-6.aspx";
const SSD_2TB_CATEGORY = "https://www.grosbill.com/disque-ssd-49.aspx?crits=3083%3A2970";

function isGpuQuery(q){ return /\b(?:rtx|gtx|rx|radeon|geforce|arc)\b/i.test(q); }
function isStorageQuery(q){ return /\bssd\b/i.test(q); }

function candidateUrls(html,q){
  const $=cheerio.load(html); const urls=[];
  $("a[href*='.aspx']").each((_,a)=>{
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
    const products=productsFromJsonLd(html,url,"Grosbill").filter(p=>matchesProductQuery(p,q));
    if(!products.length) return null;
    const p=products[0];
    return {...p,url:p.url||url,total:p.price,shipping:null,verifiedPrice:true,verification:"product-page"};
  }catch{return null;}
}

export async function searchGrosbill(q){
  let listingUrl;
  if(isGpuQuery(q)) listingUrl=GPU_CATEGORY;
  else if(isStorageQuery(q) && /\b2\s*(to|tb)\b/i.test(q)) listingUrl=SSD_2TB_CATEGORY;
  else listingUrl=`https://www.grosbill.com/recherche?q=${encodeURIComponent(q)}`;

  const html=await fetchHtml(listingUrl,{timeout:12000});
  const listingJson=productsFromJsonLd(html,BASE,"Grosbill").filter(p=>matchesProductQuery(p,q));
  const urls=[...new Set([...listingJson.map(p=>p.url).filter(Boolean),...candidateUrls(html,q)])].slice(0,12);
  const checked=await Promise.all(urls.map(url=>verifyProductPage(url,q)));
  return dedupeProducts(checked.filter(Boolean));
}
