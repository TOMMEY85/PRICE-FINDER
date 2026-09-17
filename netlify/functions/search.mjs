import {SOURCES} from "./sources/config.mjs";
import {scrapeSource} from "./sources/scraper.mjs";
import {matchesProductQuery} from "./sources/matching.mjs";

export default async(req)=>{
  const url=new URL(req.url);
  const q=url.searchParams.get("q")?.trim();
  const requested=(url.searchParams.get("sources")||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!q)return Response.json({error:"Recherche vide."},{status:400});
  const active=SOURCES.filter(s=>requested.length===0||requested.includes(s.id));
  if(!active.length)return Response.json({error:"Aucune source sélectionnée."},{status:400});

  const settled=await Promise.allSettled(active.map(source=>scrapeSource(source,q)));
  const sources=[]; let items=[]; const failures=[];
  settled.forEach((result,index)=>{
    const source=active[index];
    if(result.status==="fulfilled"){
      const raw=result.value.items||[];
      const exact=raw.filter(item=>matchesProductQuery(item,q));
      sources.push({id:source.id,name:source.name,ok:true,count:exact.length,message:exact.length?null:"Aucun produit correspondant exactement."});
      items.push(...exact);
    }else{
      const message=result.reason?.name==="AbortError"?"Délai dépassé":(result.reason?.message||"Erreur inconnue");
      sources.push({id:source.id,name:source.name,ok:false,count:0,message});
      failures.push(`${source.name}: ${message}`);
    }
  });

  items=items.filter(x=>Number.isFinite(Number(x.total))&&Number(x.total)>0)
    .sort((a,b)=>Number(a.total)-Number(b.total));

  return Response.json({query:q,items,sources,updatedAt:new Date().toISOString(),warning:failures.length?`Certaines sources n'ont pas répondu : ${failures.join(" • ")}`:null});
};
export const config={path:"/api/search"};
