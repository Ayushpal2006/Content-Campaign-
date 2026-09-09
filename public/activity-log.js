(function(){
  if(location.pathname.startsWith('/login'))return;
  let events=[],busy=false;
  async function flush(){
    if(busy || !events.length || !window.infinityIdentity)return;
    busy=true;const batch=events.splice(0,20);
    try {
      const res=await fetch('/api/infinity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'record_ui_activity',events:batch}),keepalive:true});
      const raw=await res.json();
      if(!res.ok || raw.ok===false) throw new Error('Activity logging unavailable');
    }catch{window.infinityActivityLogUnavailable=true;}finally{busy=false;}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button || button.closest('#login-form'))return;
    const label=button.getAttribute('aria-label') || button.textContent.trim();
    if(label)events.push({label:label.slice(0,120),page:location.pathname});
    if(events.length>100)events.shift();
  },true);
  setInterval(flush,20000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
})();
