const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');
const originalResolveFilename = Module._resolveFilename;
const originalTsExt = Module._extensions['.ts'];

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const candidate = path.join(srcRoot, request.slice(2));
    for (const ext of ['.ts', '.tsx', '.js']) {
      if (fs.existsSync(candidate + ext)) return candidate + ext;
    }
    if (fs.existsSync(path.join(candidate, 'index.ts'))) return path.join(candidate, 'index.ts');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
Module._extensions['.ts'] = function(module, filename) {
  const input = fs.readFileSync(filename, 'utf8');
  const out = ts.transpileModule(input, {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true, strict: false },
  }).outputText;
  module._compile(out, filename);
};

function chatResponse(system, user) {
  if (system.includes('مخطط بحث عربي') || system.includes('مخطط استعلام')) {
    const m=user.match(/السؤال:\s*(.+?)(?:\n|$)/);
    const q=(m&&m[1]) || 'أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن';
    return { intent:'research', audience:'general', semanticQuery:q, subquestions:[q], searchTerms:[q] };
  }
  if (system.includes('قيّم الأدلة') || system.includes('مقيّم أدلة')) {
    const p=JSON.parse(user);
    const q=String(p.plan?.subquestions?.[0] || p.plan?.q || '');
    const low=q.includes('تكرار الذنب') || q.includes('الانتكاس');
    return {
      ranked:(p.candidates||[]).map((x,i)=>({id:x.id,relevance:low ? Math.max(0.39,0.44-i*0.02) : Math.max(0.62,0.92-i*0.03),supports:[q],reason:'يدعم الخطة'})),
      gate:{sufficient:true,confidence:low ? 0.39 : 0.92,coveredSubquestions:1,totalSubquestions:1,missingSubquestions:[],notes:'اختبار بوابة الدليل'}
    };
  }
  if (system.includes('ولّد ادعاءات') || system.includes('مولّد إجابة')) {
    const p=JSON.parse(user); const es=(p.evidence||[]).slice(0,2); return {
      claims:es.map((e,i)=>({id:'c'+(i+1),text:'ادعاء مدعوم '+(i+1),evidenceIds:[e.id]})), limits:['حد تجريبي']
    };
  }
  if (system.includes('تحقق هل كل claim')) {
    const p=JSON.parse(user); return {claims:(p.claims||[]).map(c=>({id:c.id,status:'supported',note:'مدعوم'})),conflicts:[]};
  }
  if (system.includes('ارصد التباين')) return {conflicts:[{sourceIds:['synthetic-a','synthetic-b'],passageIds:['fixture-a','fixture-b'],type:'explicit-contradiction',summary:'تعارض اصطناعي للاختبار'}]};
  throw new Error('Unknown AI prompt');
}

global.fetch = async (input, init={}) => {
  const url=String(input);
  const body=JSON.parse(String(init.body||'{}'));
  if (url.endsWith('/embeddings')) {
    const arr=Array.isArray(body.input)?body.input:[];
    return new Response(JSON.stringify({data:arr.map((_,i)=>({index:i,embedding:[1,0,0,0]}))}),{status:200});
  }
  if (url.endsWith('/chat/completions')) {
    const messages=body.messages||[];
    const obj=chatResponse(String(messages[0]?.content||''),String(messages[1]?.content||''));
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(obj)}}]}),{status:200});
  }
  return new Response('{}',{status:404});
};

process.env.OPENAI_API_KEY='smoke-key';
process.env.OPENAI_BASE_URL='https://api.openai.com/v1';
process.env.OPENAI_MODEL='gpt-4o-mini';
process.env.OPENAI_EMBEDDING_MODEL='text-embedding-3-small';

const { runResearch } = require(path.join(srcRoot,'lib/research/pipeline.ts'));
const { detectSourceConflicts } = require(path.join(srcRoot,'lib/ai/provider.ts'));

(async()=>{
  const q='أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن';
  const ai=await runResearch(q,{mode:'ai'});
  if(ai.outcome!=='ok' || ai.ai.mode!=='evidence-gated' || ai.diagnostics.reranked.length===0 || !ai.diagnostics.evidenceGate?.sufficient || ai.diagnostics.verifiedClaimCount===0) throw new Error('AI smoke failed');
  if(ai.diagnostics.semanticRetrievalUsed && !ai.diagnostics.embeddingModel) throw new Error('semantic retrieval reported without an embedding model');
  const baseline=await runResearch(q,{mode:'baseline'});
  if(baseline.outcome!=='ok' || baseline.ai.mode!=='baseline') throw new Error('baseline smoke failed');

  const previousSaver=process.env.AI_TOKEN_SAVER;
  const previousEmbeddings=process.env.AI_USE_EMBEDDINGS;
  process.env.AI_TOKEN_SAVER='false';
  process.env.AI_USE_EMBEDDINGS='true';
  const semantic=await runResearch(q,{mode:'ai'});
  if(semantic.outcome!=='ok' || !semantic.diagnostics.semanticRetrievalUsed || !semantic.passages.some((p)=>p.retrieval?.semantic !== null)) throw new Error('semantic retrieval smoke failed');
  if(previousSaver===undefined) delete process.env.AI_TOKEN_SAVER; else process.env.AI_TOKEN_SAVER=previousSaver;
  if(previousEmbeddings===undefined) delete process.env.AI_USE_EMBEDDINGS; else process.env.AI_USE_EMBEDDINGS=previousEmbeddings;

  const safe=await runResearch('أفكر في الانتحار');
  if(safe.outcome!=='safety') throw new Error('safety smoke failed');
  // Provider routing smoke: Gemini and OpenRouter use their native/compatible REST shapes.
  const competitionFetch=global.fetch;
  const originalEnv={};
  for(const key of ['AI_PROVIDER','GEMINI_API_KEY','GEMINI_CHAT_MODEL','GEMINI_EMBEDDING_MODEL','OPENROUTER_API_KEY','OPENROUTER_MODEL','OPENROUTER_EMBEDDING_MODEL','EMBEDDING_PROVIDER']) originalEnv[key]=process.env[key];
  process.env.AI_PROVIDER='gemini';
  process.env.GEMINI_API_KEY='smoke-gemini';
  process.env.GEMINI_CHAT_MODEL='gemini-3.5-flash-lite';
  process.env.GEMINI_EMBEDDING_MODEL='gemini-embedding-2';
  global.fetch=async (input, init={})=>{
    const url=String(input);
    const body=JSON.parse(String(init.body||'{}'));
    if(url.includes(':batchEmbedContents')) return new Response(JSON.stringify({embeddings:(body.requests||[]).map(()=>({values:[1,0,0,0]}))}),{status:200});
    if(url.includes(':generateContent')) return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({ok:true, intent:'research', audience:'general', semanticQuery:q, subquestions:[q], searchTerms:['اختبار']})}]}}]}),{status:200});
    throw new Error('unexpected Gemini smoke URL');
  };
  const cfgGemini=require(path.join(srcRoot,'lib/ai/provider.ts')).getAIConfig();
  if(cfgGemini.provider!=='Gemini' || !cfgGemini.freeTierCapable) throw new Error('Gemini provider smoke failed');
  for(const key of Object.keys(originalEnv)){ if(originalEnv[key]===undefined) delete process.env[key]; else process.env[key]=originalEnv[key]; }
  global.fetch=competitionFetch;

  const oldFetch=global.fetch;
  const oldPlannerMode=process.env.AI_PLANNER_MODE;
  process.env.AI_PLANNER_MODE='ai';
  global.fetch=async()=>{throw new Error('network down')};
  const degraded=await runResearch(q,{mode:'ai'});
  global.fetch=oldFetch;
  if(oldPlannerMode===undefined) delete process.env.AI_PLANNER_MODE; else process.env.AI_PLANNER_MODE=oldPlannerMode;
  if(degraded.outcome!=='ai-unavailable' || degraded.ai.text!==null) throw new Error('provider outage smoke failed');
  const passages=[
    {chunkId:'fixture-a',text:'The item is permitted.',chapter:'fixture',page:'N/A',citationStatus:'chapter-only',excerptType:'curated-summary',keywords:[],score:0.9,source:{sourceId:'synthetic-a',slug:'a',title:'A',author:'Synthetic',publisher:'Benchmark',registryUrl:'https://example.invalid',originalUrl:'https://example.invalid'}},
    {chunkId:'fixture-b',text:'The item is not permitted.',chapter:'fixture',page:'N/A',citationStatus:'chapter-only',excerptType:'curated-summary',keywords:[],score:0.9,source:{sourceId:'synthetic-b',slug:'b',title:'B',author:'Synthetic',publisher:'Benchmark',registryUrl:'https://example.invalid',originalUrl:'https://example.invalid'}}
  ];
  const conflicts=await detectSourceConflicts('Compare the two sources.',passages);
  if(conflicts.length===0 || conflicts[0].type!=='explicit-contradiction') throw new Error('conflict smoke failed');

  const questions=JSON.parse(fs.readFileSync(path.join(root,'benchmarks','questions.json'),'utf8'));
  let caseErrors=0;
  for(const qcase of questions){
    try {
      const baseline=await runResearch(qcase.query,{mode:'baseline'});
      const actual=await runResearch(qcase.query,{mode:'ai'});
      if(actual.outcome!==qcase.expectedOutcome) throw new Error(`expected ${qcase.expectedOutcome}, got ${actual.outcome}`);
      if(qcase.expectedOutcome==='ok' && (actual.passages.length===0 || actual.diagnostics.verifiedClaimCount===0)) throw new Error('ok case had no verified evidence');
      if(qcase.expectedOutcome==='safety' && actual.diagnostics.pipeline[0]!=='policy:safety') throw new Error('safety policy did not short-circuit');
      if(qcase.expectedOutcome==='fatwa' && !actual.diagnostics.pipeline.includes('policy:fatwa-referral')) throw new Error('fatwa policy did not short-circuit');
      if(baseline.outcome==='ok' && qcase.expectedOutcome!=='ok' && qcase.type==='out-of-scope') throw new Error('baseline unexpectedly answered out-of-scope case');
    } catch (error) {
      caseErrors++;
      console.error('CASE FAILURE',qcase.id,error.stack||error);
    }
  }
  if(caseErrors>0) throw new Error(`${caseErrors} benchmark cases failed in runtime smoke`);

  const lowConfidence=await runResearch('تكرار الذنب والانتكاس',{mode:'ai'});
  if(lowConfidence.outcome!=='ok' || lowConfidence.diagnostics.evidenceGate?.coveredSubquestions!==1 || lowConfidence.diagnostics.evidenceGate?.totalSubquestions!==1 || (lowConfidence.diagnostics.evidenceGate?.aiConfidence ?? 1)>=0.5) throw new Error('low-confidence topic regression failed');
  const pageGuard=await runResearch('اذكر لي الصفحة 500 من الداء والدواء بنصها',{mode:'ai'});
  if(pageGuard.outcome!=='abstained' || !pageGuard.diagnostics.pipeline.includes('policy:citation-coverage')) throw new Error('citation coverage guard failed');

  console.log(JSON.stringify({ai:'PASS',baseline:'PASS',safety:'PASS',degraded:'PASS',conflict:'PASS',benchmarkCases:questions.length,benchmarkFailures:caseErrors,lowConfidenceTopic:'PASS',citationGuard:'PASS',verifiedClaims:ai.diagnostics.verifiedClaimCount,finalPassages:ai.passages.length},null,2));
})().catch(err=>{console.error(err.stack||err);process.exit(1)});
