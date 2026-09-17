import { searchCybertek } from "./cybertek.mjs";
import { searchLDLC } from "./ldlc.mjs";
import { searchGrosbill } from "./grosbill.mjs";
import { searchMateriel } from "./materiel.mjs";
import { searchRueDuCommerce } from "./rueducommerce.mjs";
import { searchBoulanger } from "./boulanger.mjs";

export const SOURCES=[
  {id:"grosbill",name:"Grosbill",base:"https://www.grosbill.com",adapter:searchGrosbill},
  {id:"materiel",name:"Materiel.net",base:"https://www.materiel.net",adapter:searchMateriel},
  {id:"cybertek",name:"Cybertek",base:"https://www.cybertek.fr",adapter:searchCybertek},
  {id:"ldlc",name:"LDLC.COM",base:"https://www.ldlc.com",adapter:searchLDLC},
  {id:"pccomponentes",name:"PcComponentes.fr",base:"https://www.pccomponentes.fr",search:q=>`https://www.pccomponentes.fr/search/?query=${encodeURIComponent(q)}`},
  {id:"rueducommerce",name:"Rue du Commerce",base:"https://www.rueducommerce.fr",adapter:searchRueDuCommerce},
  {id:"infomax",name:"Infomax Paris",base:"https://infomaxparis.com",search:q=>`https://infomaxparis.com/search?q=${encodeURIComponent(q)}`},
  {id:"memorypc",name:"Memory PC",base:"https://www.memorypc.fr",search:q=>`https://www.memorypc.fr/search?sSearch=${encodeURIComponent(q)}`},
  {id:"pcspecialist",name:"PCSpecialist.fr",base:"https://www.pcspecialist.fr",search:q=>`https://www.pcspecialist.fr/search/?query=${encodeURIComponent(q)}`},
  {id:"boulanger",name:"Boulanger",base:"https://www.boulanger.com",adapter:searchBoulanger},
  {id:"maxesport",name:"Maxesport",base:"https://www.maxesport.gg",search:q=>`https://www.maxesport.gg/fr/recherche?controller=search&s=${encodeURIComponent(q)}`}
];
