const q=document.getElementById('q');
document.getElementById('go').onclick=()=>{const v=q.value.trim();if(v)chrome.tabs.create({url:`http://127.0.0.1:8765/?q=${encodeURIComponent(v)}`})};
q.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('go').click()});
