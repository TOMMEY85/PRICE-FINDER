export const SOURCES=[
{id:"grosbill",name:"Grosbill",base:"https://www.grosbill.com",search:q=>`https://www.grosbill.com/recherche?q=${encodeURIComponent(q)}`},
{id:"materiel",name:"Materiel.net",base:"https://www.materiel.net",search:q=>`https://www.materiel.net/recherche/${encodeURIComponent(q)}.html`},
{id:"cybertek",name:"Cybertek",base:"https://www.cybertek.fr",search:q=>`https://www.cybertek.fr/recherche.aspx?SEARCH=${encodeURIComponent(q)}`},
{id:"ldlc",name:"LDLC.COM",base:"https://www.ldlc.com",search:q=>`https://www.ldlc.com/recherche/${encodeURIComponent(q)}/`},
{id:"pccomponentes",name:"PcComponentes.fr",base:"https://www.pccomponentes.fr",search:q=>`https://www.pccomponentes.fr/search/?query=${encodeURIComponent(q)}`},
{id:"rueducommerce",name:"Rue du Commerce",base:"https://www.rueducommerce.fr",search:q=>`https://www.rueducommerce.fr/r/${encodeURIComponent(q)}`},
{id:"infomax",name:"Infomax Paris",base:"https://infomaxparis.com",search:q=>`https://infomaxparis.com/search?q=${encodeURIComponent(q)}`},
{id:"memorypc",name:"Memory PC",base:"https://www.memorypc.fr",search:q=>`https://www.memorypc.fr/search?sSearch=${encodeURIComponent(q)}`},
{id:"pcspecialist",name:"PCSpecialist.fr",base:"https://www.pcspecialist.fr",search:q=>`https://www.pcspecialist.fr/search/?query=${encodeURIComponent(q)}`},
{id:"boulanger",name:"Boulanger",base:"https://www.boulanger.com",search:q=>`https://www.boulanger.com/resultats?tr=${encodeURIComponent(q)}`},
{id:"maxesport",name:"Maxesport",base:"https://www.maxesport.gg",search:q=>`https://www.maxesport.gg/fr/recherche?controller=search&s=${encodeURIComponent(q)}`}
];
