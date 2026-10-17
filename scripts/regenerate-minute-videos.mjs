import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { generateVideo, probe } from '../functions/src/video-media.js';
import { VIDEO_FORMAT, VIDEO_DURATION } from '../functions/src/video-policy.js';
const repo = fileURLToPath(new URL('../', import.meta.url));
const mode=process.argv[2];
if(!['prepare','publish','validate'].includes(mode))throw Error('Use prepare, validate, or publish <artifact directory>');
const dir=process.argv[3]||await mkdtemp(path.join(tmpdir(),'minute-videos-'));
const allowedIds=['react','docker','agentic_rag','databricks'];
const ids=process.env.MINUTE_TOPIC_IDS ? process.env.MINUTE_TOPIC_IDS.split(',') : allowedIds;
if(ids.some(id=>!allowedIds.includes(id)))throw Error('Unexpected replacement topic');
async function validate(id) {
  const folder=path.join(dir,id), output=path.join(folder,'final.mp4');
  const result=JSON.parse(await readFile(path.join(folder,'result.json'),'utf8'));
  const original=JSON.parse(await readFile(path.join(folder,'original.json'),'utf8'));
  const info=await probe(output);
  const title=original.fields.title.stringValue;
  if(result.format!==VIDEO_FORMAT || result.duration!==59 || !result.analogy ||
     !result.script.startsWith(`${title} in 1 minute.`) ||
     !result.script.includes('Now, ') || !result.captions.startsWith('WEBVTT') ||
     Math.abs(Number(info.format.duration)-59)>.2 ||
     !info.streams.some(s=>s.codec_type==='audio') ||
     !info.streams.some(s=>s.codec_type==='video'&&s.width===720&&s.height===1280))
    throw Error(`Media validation failed: ${id}`);
  return { result, original, output };
}
if(mode==='validate') {
  for(const id of ids) { await validate(id); console.log(id,'validated'); }
  process.exit(0);
}
const require=createRequire(import.meta.url);
const auth=require('/usr/local/lib/node_modules/firebase-tools/lib/auth.js');
const account=auth.getProjectDefaultAccount(repo)||auth.getGlobalDefaultAccount();
const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const headers={Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'};
const base='https://firestore.googleapis.com/v1/projects/ai-space-f1d31/databases/(default)/documents';
const bucket='ai-space-f1d31.firebasestorage.app';
async function checked(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(`Request failed: ${new URL(url).hostname} ${r.status}`);return r;}
console.log('Artifacts:',dir);
if(mode==='prepare'){
  let pending=0;
  for(const id of ids) { try { await validate(id); } catch { pending++; } }
  if(!pending) { console.log('All videos already prepared; no paid requests.'); process.exit(0); }
  let reservedCount=0;
  try{const saved=JSON.parse(await readFile(path.join(dir,'reservation.json'),'utf8'));if(saved.day===new Date().toISOString().slice(0,10))reservedCount=saved.count;}catch{}
  if(reservedCount<pending){
    const day=new Date().toISOString().slice(0,10);
    const response=await fetch(`${base}/videoBudgets/${day}`,{headers,signal:AbortSignal.timeout(30000)});
    if(!response.ok && response.status!==404)throw Error(`Budget lookup failed: ${response.status}`);
    const budget=response.status===404 ? {name:`projects/ai-space-f1d31/databases/(default)/documents/videoBudgets/${day}`} : await response.json();
    const used=Number(budget.fields?.generations?.integerValue||0);
    const additional=pending-reservedCount;
    if(used+additional>10)throw Error('Four replacements exceed the approved daily budget');
    await checked(`${base}:commit`,{method:'POST',headers,body:JSON.stringify({writes:[{update:{name:budget.name,fields:{generations:{integerValue:String(used+additional)}}},updateMask:{fieldPaths:['generations']},currentDocument:budget.updateTime ? {updateTime:budget.updateTime} : {exists:false}}]})});
    await writeFile(path.join(dir,'reservation.json'),JSON.stringify({reserved:true,day,count:pending}),{mode:0o600});
  }
  const keys={};
  for(const [k,name] of [['gemini','GEMINI_API_KEY'],['eleven','ELEVENLABS_API_KEY']]){
    const secret=await(await checked(`https://secretmanager.googleapis.com/v1/projects/ai-space-f1d31/secrets/${name}/versions/latest:access`,{headers})).json();
    keys[k]=Buffer.from(secret.payload.data,'base64').toString().trim();
  }
  // Cache successful provider responses locally so a resumed migration does not
  // repeat paid work. No keys or request headers are persisted.
  const original=globalThis.fetch;
  await mkdir(path.join(dir,'responses'),{recursive:true});
  globalThis.fetch=async(url,options)=>{
    const host=new URL(url).hostname;
    if(!['generativelanguage.googleapis.com','api.elevenlabs.io'].includes(host))return original(url,options);
    const hash=createHash('sha256').update(String(url)+String(options?.body||'')).digest('hex');
    const file=path.join(dir,'responses',hash);
    try{return new Response(await readFile(file),{status:200});}catch{}
    const r=await original(url,options);
    if(!r.ok){
      const failure=await r.clone().json().catch(()=>({}));
      let message=String(failure.error?.message||failure.detail?.message||'Provider rejected request');
      for(const key of Object.values(keys))message=message.replaceAll(key,'[redacted]');
      console.log('Provider failure',JSON.stringify({host,status:r.status,message,retryAfter:r.headers.get('retry-after')}));
      return r;
    }
    const bytes=Buffer.from(await r.arrayBuffer());
    await writeFile(file,bytes,{mode:0o600});
    console.log('Completed provider request:',host);
    return new Response(bytes,{status:200});
  };
  const catalog=JSON.parse(await readFile(new URL('../functions/src/video-catalog.json',import.meta.url),'utf8'));
  for(const id of ids){
    const folder=path.join(dir,id);await mkdir(folder,{recursive:true});
    try{await validate(id);console.log(id,'already prepared');continue;}catch{}
    const doc=await(await checked(`${base}/topicVideos/${id}`,{headers})).json();
    if(doc.fields.format?.stringValue===VIDEO_FORMAT){console.log(id,'already live');continue;}
    await writeFile(path.join(folder,'original.json'),JSON.stringify(doc),{mode:0o600});
    const result=await generateVideo(catalog.find(t=>t.id===id),folder,keys);
    const info=await probe(result.output);
    if(Math.abs(Number(info.format.duration)-59)>.2||!info.streams.some(s=>s.codec_type==='audio')||!info.streams.some(s=>s.codec_type==='video'&&s.width===720&&s.height===1280))throw Error('Media validation failed');
    await writeFile(path.join(folder,'result.json'),JSON.stringify(result),{mode:0o600});
    console.log(id,'READY',JSON.stringify({duration:info.format.duration,analogy:result.analogy}));
  }
}else{
  const writes=[];
  const originals=[];
  // Validate all four before uploading or changing any public pointer.
  const validated = await Promise.all(ids.map(validate));
  for(const id of ids){
    const { original: doc, result, output }=validated[ids.indexOf(id)];
    originals.push(doc);
    const version=randomUUID(),objectPath=`published-videos/${id}/minute-${version}.mp4`,downloadToken=randomUUID();
    await checked(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&ifGenerationMatch=0&name=${encodeURIComponent(objectPath)}`,{method:'POST',headers:{Authorization:headers.Authorization,'Content-Type':'video/mp4'},body:await readFile(output)});
    await checked(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}`,{method:'PATCH',headers,body:JSON.stringify({cacheControl:'public, max-age=31536000, immutable',metadata:{firebaseStorageDownloadTokens:downloadToken}})});
    const url=`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
    await checked(url,{method:'HEAD'});
    const fields={url:{stringValue:url},script:{stringValue:result.script},captions:{stringValue:result.captions},duration:{integerValue:String(VIDEO_DURATION)},format:{stringValue:VIDEO_FORMAT},analogy:{stringValue:result.analogy},formatUpdatedAt:{timestampValue:new Date().toISOString()}};
    writes.push({update:{name:doc.name,fields},updateMask:{fieldPaths:Object.keys(fields)}});
  }
  // Transactionally compare original URLs, not stale updateTime values: views
  // can legitimately change while generation runs. Field masks preserve them.
  const { transaction }=await(await checked(`${base}:beginTransaction`,{method:'POST',headers,body:'{}'})).json();
  try {
    for(const doc of originals) {
      const live=await(await checked(`https://firestore.googleapis.com/v1/${doc.name}?transaction=${encodeURIComponent(transaction)}`,{headers})).json();
      if(live.fields.url.stringValue!==doc.fields.url.stringValue)throw Error('Published video changed; refusing to replace it.');
    }
    await checked(`${base}:commit`,{method:'POST',headers,body:JSON.stringify({writes,transaction})});
  } catch(error) {
    await checked(`${base}:rollback`,{method:'POST',headers,body:JSON.stringify({transaction})}).catch(()=>{});
    throw error;
  }
  for(const id of ids) {
    const live=await(await checked(`${base}/topicVideos/${id}`,{headers})).json();
    if(live.fields.format.stringValue!==VIDEO_FORMAT || Number(live.fields.duration.integerValue)!==59)throw Error('Publication verification failed');
    console.log(id,'live: 59 seconds');
  }
  console.log('Published all four replacements atomically. Original media retained for rollback.');
}
