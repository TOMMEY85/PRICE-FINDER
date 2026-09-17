import * as cheerio from "cheerio";
import { parsePrice, absoluteUrl, productsFromJsonLd, dedupeProducts, fetchHtml } from "./helpers.mjs";

function genericExtract(html, baseUrl, sourceName){
  const jsonLd = productsFromJsonLd(html, baseUrl, sourceName);
  if(jsonLd.length) return dedupeProducts(jsonLd);

  const $ = cheerio.load(html);
  const products=[];
  $("[itemtype*='Product'],.product,.product-item,.product-card,.product-card-item,[data-product-id],[data-product]").slice(0,40).each((_,el)=>{
    const node=$(el);
    const title=node.find("[itemprop='name']").first().text().trim() || node.find("h2,h3,.product-title,.name,.title").first().text().trim();
    const priceText=node.find("[itemprop='price']").first().attr("content") || node.find("[itemprop='price']").first().text() || node.find(".price,.product-price,[class*='price']").first().text();
    const price=parsePrice(priceText);
    if(!title || !price) return;
    const href=node.find("a").first().attr("href");
    const image=node.find("img").first().attr("src") || node.find("img").first().attr("data-src");
    products.push({
      id:node.attr("data-product-id") || absoluteUrl(href,baseUrl) || title,
      source:sourceName,
      title,
      price,
      shipping:null,
      total:price,
      currency:"EUR",
      url:absoluteUrl(href,baseUrl) || baseUrl,
      image:absoluteUrl(image,baseUrl),
      condition:"NEW",
      stock:null,
      reference:node.attr("data-product-id") || null
    });
  });
  return dedupeProducts(products);
}

export async function scrapeSource(source,q){
  if(typeof source.adapter === "function"){
    try{
      const items=await source.adapter(q);
      return {id:source.id,name:source.name,ok:true,items,message:items.length?null:"Aucun produit détecté."};
    }catch(error){
      throw error;
    }
  }

  const url=source.search(q);
  const html=await fetchHtml(url,{timeout:10000});
  const items=genericExtract(html,source.base,source.name);
  return {id:source.id,name:source.name,ok:true,items,message:items.length?null:"Aucun produit détecté dans le HTML reçu."};
}
