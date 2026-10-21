import PAGE from './page.js';
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json;charset=utf-8'}});
const norm=s=>String(s).replace(/\s+/g,'').replace(/[，。,.？?：:;；！!（）()\[\]【】＿_]/g,'').toLowerCase();
const TYPES=['填空','單選','複選'];
export default{async fetch(req,env){
 const url=new URL(req.url),p=url.pathname,m=req.method;
 if(p==='/'||p==='/index.html')return new Response(PAGE,{headers:{'content-type':'text/html;charset=utf-8'}});
 if(!p.startsWith('/api/'))return new Response('Not found',{status:404});
 try{
  if(p==='/api/data'&&m==='GET'){
   const ch=await env.DB.prepare('SELECT id,num,title FROM chapters ORDER BY num').all();
   const qs=await env.DB.prepare('SELECT id,chapter_id,type,q,a FROM questions ORDER BY id').all();
   return J({chapters:ch.results,questions:qs.results.map(r=>({...r,a:JSON.parse(r.a)}))});
  }
  if(m!=='GET'){
   const t=req.headers.get('x-token');
   if(!env.ADMIN_TOKEN||t!==env.ADMIN_TOKEN)return J({error:'密碼錯誤或未設定 ADMIN_TOKEN'},401);
  }
  if(p==='/api/chapters'&&m==='POST'){
   const b=await req.json();const num=parseInt(b.num);
   if(!Number.isInteger(num)||num<0)return J({error:'章節編號錯誤'},400);
   await env.DB.prepare('INSERT INTO chapters(num,title) VALUES(?,?) ON CONFLICT(num) DO UPDATE SET title=CASE WHEN excluded.title<>\'\' THEN excluded.title ELSE title END').bind(num,String(b.title||'').slice(0,100)).run();
   const r=await env.DB.prepare('SELECT id,num,title FROM chapters WHERE num=?').bind(num).first();
   return J(r);
  }
  let mm=p.match(/^\/api\/chapters\/(\d+)$/);
  if(mm&&m==='DELETE'){
   const id=+mm[1];
   const r=await env.DB.batch([env.DB.prepare('DELETE FROM questions WHERE chapter_id=?').bind(id),env.DB.prepare('DELETE FROM chapters WHERE id=?').bind(id)]);
   return J({deletedQuestions:r[0].meta.changes});
  }
  mm=p.match(/^\/api\/chapters\/(\d+)\/questions$/);
  if(mm&&m==='DELETE'){
   const r=await env.DB.prepare('DELETE FROM questions WHERE chapter_id=?').bind(+mm[1]).run();
   return J({deleted:r.meta.changes});
  }
  if(p==='/api/questions'&&m==='POST'){
   const b=await req.json();const cid=+b.chapter_id;
   const ex=await env.DB.prepare('SELECT 1 FROM chapters WHERE id=?').bind(cid).first();
   if(!ex)return J({error:'章節不存在'},400);
   const st=env.DB.prepare('INSERT OR IGNORE INTO questions(chapter_id,type,q,qkey,a) VALUES(?,?,?,?,?)');
   const items=(b.items||[]).filter(x=>x&&x.q&&Array.isArray(x.a)&&x.a.length&&TYPES.includes(x.type));
   let added=0;
   for(let i=0;i<items.length;i+=50){
    const rs=await env.DB.batch(items.slice(i,i+50).map(x=>st.bind(cid,x.type,x.q,norm(x.q),JSON.stringify(x.a))));
    rs.forEach(r=>added+=r.meta.changes);
   }
   return J({added,duplicates:items.length-added});
  }
  mm=p.match(/^\/api\/questions\/(\d+)$/);
  if(mm&&m==='DELETE'){await env.DB.prepare('DELETE FROM questions WHERE id=?').bind(+mm[1]).run();return J({ok:1})}
  if(mm&&m==='PATCH'){
   const b=await req.json();
   if(!TYPES.includes(b.type))return J({error:'類型錯誤'},400);
   await env.DB.prepare('UPDATE questions SET type=? WHERE id=?').bind(b.type,+mm[1]).run();return J({ok:1});
  }
  return J({error:'Not found'},404);
 }catch(e){return J({error:String(e.message||e)},500)}
}};
