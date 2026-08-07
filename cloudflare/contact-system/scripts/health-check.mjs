const base=(process.env.SSX_CONTACT_API||process.argv[2]||'').replace(/\/$/,'');
if(!base){console.error('Set SSX_CONTACT_API or pass the Worker URL.');process.exit(2)}
const checks=['/api/health','/api/tasks/summary'];
let failed=false;
for(const path of checks){
  try{
    const r=await fetch(base+path); const text=await r.text();
    console.log(`${r.ok?'PASS':'FAIL'} ${r.status} ${path} ${text.slice(0,300)}`);
    if(!r.ok)failed=true;
  }catch(e){failed=true;console.error(`FAIL ${path}`,e.message)}
}
process.exit(failed?1:0);
