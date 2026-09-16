(() => {
  const text = `${document.title} ${location.href}`;
  const keywords = /(rtx|gtx|radeon|rx \d|ryzen|core i[3579]|core ultra|geforce|arc a\d|ssd|nvme|ddr[45]|ram|mémoire|carte graphique|processeur|cpu|gpu|alimentation|carte mère|motherboard|boîtier|watercooling)/i;
  if (!keywords.test(text)) return;
  let last='';
  document.addEventListener('mouseup', () => {
    const selection=window.getSelection()?.toString().trim();
    if (!selection || selection===last || selection.length>120) return;
    last=selection;
    const old=document.getElementById('pf-finder-btn'); if(old) old.remove();
    const btn=document.createElement('button'); btn.id='pf-finder-btn'; btn.textContent='🔎 Comparer avec PRICE FINDER';
    Object.assign(btn.style,{position:'fixed',zIndex:2147483647,right:'18px',bottom:'18px',padding:'11px 14px',border:'0',borderRadius:'10px',background:'#e50914',color:'#fff',fontWeight:'700',boxShadow:'0 5px 25px #0008',cursor:'pointer'});
    btn.onclick=()=>chrome.runtime.sendMessage({type:'openFinder',query:selection});
    document.body.appendChild(btn); setTimeout(()=>btn.remove(),8000);
  });
})();
