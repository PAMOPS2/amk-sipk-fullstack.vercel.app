(function(){
  if(window.__SIPK_SUPABASE_ADAPTER__) return;
  const API='/api/db';
  const listeners=new Map();
  const cache=new Map();
  function key(p){return String(p||'').replace(/^\/+|\/+$/g,'');}
  function snap(v){return {val:()=>v, exists:()=>v!==null && v!==undefined, exportVal:()=>v};}
  function schedule(ref, cb){
    const id=setInterval(async()=>{try{const v=await ref.once('value'); cb(v)}catch(e){console.warn('[SIPK] poll',e)}},3000);
    return id;
  }
  async function request(path, method, value, action){
    const body={path:key(path), value, action:action||method.toLowerCase()};
    const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.ok===false) throw new Error(j.error||('HTTP '+r.status));
    return j.value;
  }
  class Ref{
    constructor(path){this.path=key(path);}
    child(c){return new Ref(this.path+'/'+key(c));}
    async once(){const r=await fetch(API+'?path='+encodeURIComponent(this.path)); const j=await r.json(); if(!r.ok||j.ok===false) throw new Error(j.error||('HTTP '+r.status)); cache.set(this.path,j.value); return snap(j.value);}
    async set(v){const x=await request(this.path,'POST',v,'set'); cache.set(this.path,x); return x;}
    async update(v){const x=await request(this.path,'POST',v,'update'); cache.set(this.path,x); return x;}
    async remove(){const x=await request(this.path,'POST',null,'remove'); cache.delete(this.path); return x;}
    push(){const id='-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8); return new PushRef(this.path+'/'+id,id);}
    on(event,cb){ if(event!=='value') return this; this.off('value'); const run=async()=>{try{const s=await this.once();cb(s)}catch(e){console.warn('[SIPK] listener',e)}}; run(); const id=schedule(this,cb); listeners.set(this.path,{id,cb}); return this; }
    off(event){const x=listeners.get(this.path); if(x){clearInterval(x.id);listeners.delete(this.path)} return this;}
    goOnline(){}
  }
  class PushRef extends Ref{constructor(path,id){super(path);this.key=id;}}
  const app={options:{},delete:async()=>{}};
  window.firebase={apps:[],_app:app,initializeApp:(config)=>{app.options=config||{}; if(!window.firebase.apps.length) window.firebase.apps.push(app); return app;},app:()=>app,database:()=>({ref:(p)=>new Ref(p),goOnline:()=>{}})};
  window.__SIPK_SUPABASE_ADAPTER__=true;
})();
