import * as cheerio from "cheerio";
import { absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";
import { matchesProductQuery } from "./matching.mjs";

const BASE="https://www.boulanger.com";

function candidateUrls(html,q){
  const $=cheerio.load(html); const urls=[];
  $("a[href*='/ref/']").each((_,a)=>{
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
    const products=productsFromJsonLd(html,url,"Boulanger").filter(p=>matchesProductQuery(p,q));
    if(products.length){
      const p=products[0];
      return {...p,url:p.url||url,total:p.price,shipping:null,verifiedPrice:true,verification:"product-page"};
    }

    const $=cheerio.load(html);
    const title=$("h1").first().text().replace(/\s+/g," ").trim();
    const amount=$("meta[property='product:price:amount'],meta[itemprop='price']").first().attr("content") || $("[itemprop='price']").first().text();
    const price=Number(String(amount||"").replace(/[^0-9,.]/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",","."));
    if(!title || !Number.isFinite(price) || price<=0 || !matchesProductQuery({title},q)) return null;
    const image=$("meta[property='og:image']").attr("content") || $("img").first().attr("src");
    return {id:url,source:"Boulanger",title,price,shipping:null,total:price,currency:"EUR",url,image:absoluteUrl(image,url),condition:"NEW",stock:null,reference:url.match(/\/ref\/([^/?#]+)/i)?.[1]||null,verifiedPrice:true,verification:"product-page"};
  }catch{return null;}
}

export async function searchBoulanger(q){
  const searchUrl=`${BASE}/resultats?tr=${encodeURIComponent(q)}`;
  const html=await fetchHtml(searchUrl,{timeout:12000});
  const listingJson=productsFromJsonLd(html,BASE,"Boulanger").filter(p=>matchesProductQuery(p,q));
  const urls=[...new Set([...listingJson.map(p=>p.url).filter(Boolean),...candidateUrls(html,q)])].slice(0,12);
  const checked=await Promise.all(urls.map(url=>verifyProductPage(url,q)));
  return dedupeProducts(checked.filter(Boolean));
}
