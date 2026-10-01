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
  if (system.includes('مخطط استعلام')) return {
    intent:'research', audience:'general', semanticQuery:'أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن',
    subquestions:['أثر قسوة القلب والتأثر بالقرآن'], searchTerms:['قسوة القلب','القرآن','التأثر']
  };
  if (system.includes('مقيّم أدلة')) {
    const p=JSON.parse(user); return {
      ranked:p.candidates.map((x,i)=>({id:x.id,relevance:0.95-i*0.03,supports:['sub1'],reason:'يدعم الخطة'})),
      gate:{sufficient:true,confidence:0.95,coveredSubquestions:1,totalSubquestions:1,missingSubquestions:[],notes:'كافٍ'}
    };
  }
  if (system.includes('مولّد إجابة')) {
    const p=JSON.parse(user); const es=(p.evidence||[]).slice(0,2); return {
      claims:es.map((e,i)=>({id:'c'+(i+1),text:'ادعاء مدعوم '+(i+1),evidenceIds:[e.id]})), limits:['حد تجريبي']
    };
  }
  if (system.includes('مدقّق ادعاءات')) {
    const p=JSON.parse(user); return {claims:(p.claims||[]).map(c=>({id:c.id,status:'supported',note:'مدعوم'})),conflicts:[]};
  }
  if (system.includes('كاشف تباين')) return {conflicts:[{sourceIds:['synthetic-a','synthetic-b'],passageIds:['fixture-a','fixture-b'],type:'explicit-contradiction',summary:'تعارض اصطناعي للاختبار'}]};
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
  if(ai.outcome!=='ok' || ai.ai.mode!=='evidence-gated' || !ai.diagnostics.semanticRetrievalUsed || ai.diagnostics.reranked.length===0 || !ai.diagnostics.evidenceGate?.sufficient || ai.diagnostics.verifiedClaimCount===0) throw new Error('AI smoke failed');
  const baseline=await runResearch(q,{mode:'baseline'});
  if(baseline.outcome!=='ok' || baseline.ai.mode!=='baseline') throw new Error('baseline smoke failed');
  const safe=await runResearch('أفكر في الانتحار');
  if(safe.outcome!=='safety') throw new Error('safety smoke failed');
  const oldFetch=global.fetch;
  global.fetch=async()=>{throw new Error('network down')};
  const degraded=await runResearch(q,{mode:'ai'});
  global.fetch=oldFetch;
  if(degraded.outcome!=='ai-unavailable' || degraded.ai.text!==null) throw new Error('degraded smoke failed');
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
      await runResearch(qcase.query,{mode:'baseline'});
      await runResearch(qcase.query,{mode:'ai'});
    } catch (error) {
      caseErrors++;
      console.error('CASE FAILURE',qcase.id,error.stack||error);
    }
  }
  if(caseErrors>0) throw new Error(`${caseErrors} benchmark cases crashed in runtime smoke`);

  console.log(JSON.stringify({ai:'PASS',baseline:'PASS',safety:'PASS',degraded:'PASS',conflict:'PASS',benchmarkCases:questions.length,benchmarkCrashes:caseErrors,verifiedClaims:ai.diagnostics.verifiedClaimCount,finalPassages:ai.passages.length},null,2));
})().catch(err=>{console.error(err.stack||err);process.exit(1)});
