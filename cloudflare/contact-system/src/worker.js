const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });
      if (url.pathname === '/api/health') return json({ ok:true, service:'ssx-contact-system', version:'v3' });
      if (url.pathname === '/api/intake' && request.method === 'POST') return await intake(request, env);
      if (url.pathname === '/api/tasks' && request.method === 'GET') return await tasks(url, env);
      if (url.pathname.startsWith('/api/tasks/') && request.method === 'PATCH') return await patchTask(request, env, url.pathname.split('/').pop());
      if (url.pathname === '/api/tasks/summary' && request.method === 'GET') return await summary(env);
      return json({ error:'not_found' },404);
    } catch (e) { console.error(e); return json({ error:'server_error' },500); }
  },
  async scheduled(event, env) { await createDigest(env, event.scheduledTime); }
};

async function intake(request, env){
  const type=request.headers.get('content-type')||''; let rawText='', sourceType='paste', files=[];
  if(type.includes('multipart/form-data')){
    const form=await request.formData(); rawText=String(form.get('pasted_text')||form.get('raw_text')||'').trim();
    for(const v of form.getAll('files')) if(v instanceof File){const id=crypto.randomUUID(), key=`contact-intake/${new Date().toISOString().slice(0,10)}/${id}/${safe(v.name)}`; await env.CONTACT_FILES.put(key,await v.arrayBuffer(),{httpMetadata:{contentType:v.type||'application/octet-stream'}}); files.push({id,key,name:v.name,type:v.type,size:v.size});}
    sourceType=files.length?'file':'paste';
  } else { const b=await request.json(); rawText=String(b.raw_text||b.pasted_text||'').trim(); sourceType=b.source_type||'paste'; }
  if(!rawText&&!files.length)return json({error:'empty_intake'},400);
  const id=crypto.randomUUID(), now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO intake_submissions (id,source_type,raw_text,status,created_at,updated_at) VALUES (?,?,?,?,?,?)`).bind(id,sourceType,rawText,'received',now,now).run();
  for(const f of files) await env.DB.prepare(`INSERT INTO intake_files (id,intake_id,file_name,file_type,size_bytes,r2_key,created_at) VALUES (?,?,?,?,?,?,?)`).bind(f.id,id,f.name,f.type,f.size,f.key,now).run();
  const taskIds=[]; for(const t of extractTasks(rawText)){const tid=crypto.randomUUID(); taskIds.push(tid); await env.DB.prepare(`INSERT INTO tasks (id,intake_id,title,description,status,priority,due_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(tid,id,t.title,t.description,'open',t.priority,t.due_at,now,now).run();}
  await env.DB.prepare(`UPDATE intake_submissions SET status=?,updated_at=? WHERE id=?`).bind('processed',new Date().toISOString(),id).run();
  return json({ok:true,intake_id:id,files:files.length,task_ids:taskIds,status:'processed'});
}
async function tasks(url,env){const status=url.searchParams.get('status')||'open';const r=await env.DB.prepare(`SELECT * FROM tasks WHERE status=? ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,due_at ASC,created_at DESC LIMIT 200`).bind(status).all();return json({ok:true,tasks:r.results||[]});}
async function patchTask(request,env,id){const b=await request.json(),now=new Date().toISOString();const allowed=['open','done','dismissed'];if(b.status&&!allowed.includes(b.status))return json({error:'invalid_status'},400);await env.DB.prepare(`UPDATE tasks SET status=COALESCE(?,status),updated_at=? WHERE id=?`).bind(b.status||null,now,id).run();return json({ok:true,id});}
async function summary(env){const r=await env.DB.prepare(`SELECT status,priority,COUNT(*) count FROM tasks GROUP BY status,priority`).all();return json({ok:true,summary:r.results||[]});}
async function createDigest(env,scheduledTime){const now=new Date(scheduledTime||Date.now());const key=`digest:${now.toISOString().slice(0,13)}`;await env.DB.prepare(`INSERT OR IGNORE INTO digest_runs (id,recipient,digest_key,scheduled_at,payload_json,created_at) VALUES (?,?,?,?,?,?)`).bind(crypto.randomUUID(),env.DALE_EMAIL||'dale',key,now.toISOString(),JSON.stringify({timezone:'America/Chicago'}),new Date().toISOString()).run();}
function extractTasks(text){if(!text)return[];const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const action=/\b(please|need|needs|send|provide|confirm|review|call|follow up|follow-up|schedule|submit|complete|due|deadline|quote|pricing|size|sizing|meeting)\b/i;const out=[];for(const line of lines){if(action.test(line)){let priority=/\b(urgent|asap|today|overdue|deadline)\b/i.test(line)?'urgent':/\b(block|needed|need|quote|bid)\b/i.test(line)?'high':'normal';out.push({title:line.slice(0,160),description:line.slice(0,1000),priority,due_at:due(line)});if(out.length>=20)break;}}return out;}
function due(s){const m=s.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);if(!m)return null;let y=m[3]?Number(m[3]):new Date().getFullYear();if(y<100)y+=2000;const d=new Date(Date.UTC(y,Number(m[1])-1,Number(m[2]),17));return isNaN(d.getTime())?null:d.toISOString();}
function safe(s){return String(s||'file').replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,180)}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS})}