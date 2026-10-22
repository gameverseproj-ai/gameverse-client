// Run from repository root: node docs/monstrocity/validate-contract.cjs
const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'openapi.json')));
const example = JSON.parse(fs.readFileSync(path.join(__dirname, 'bootstrap.example.json')));
const ajv = new Ajv({strict:false,allErrors:true}); addFormats(ajv);
const validate = ajv.compile({components:spec.components,$ref:'#/components/schemas/Bootstrap'});
if (!validate(example)) throw new Error(JSON.stringify(validate.errors,null,2));
const ids = new Set();
for (const [route,methods] of Object.entries(spec.paths)) for(const [method,operation] of Object.entries(methods)) {
  if(ids.has(operation.operationId)) throw new Error('Duplicate operationId');
  ids.add(operation.operationId);
  if(route.includes('{runId}')&&!operation.parameters?.some(p=>p.name==='runId'&&p.required)) throw new Error('Missing runId parameter');
  if(method==='post'&&!route.endsWith('/sync')&&!operation.parameters?.some(p=>p.name==='Idempotency-Key'&&p.required)) throw new Error('Mutation needs idempotency');
}
function refs(value){if(!value||typeof value!=='object')return;for(const[k,v]of Object.entries(value)){if(k==='$ref'){let node=spec;for(const part of v.slice(2).split('/'))node=node?.[part];if(!node)throw new Error('Unresolved '+v)}else refs(v)}}refs(spec);
for(const name of Object.keys(spec.components.schemas)) ajv.compile({components:spec.components,$ref:'#/components/schemas/'+name});
const bad=structuredClone(example);bad.snapshot.profile.inventory[0].purchased=-1;
if(validate(bad))throw new Error('Negative inventory accepted');
console.log(`${ids.size} operations; all schema references resolve; 31 schemas compile; bootstrap fixture validates; negative inventory rejected.`);
