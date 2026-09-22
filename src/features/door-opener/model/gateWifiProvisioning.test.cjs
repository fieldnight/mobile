const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function load(name, overrides = {}, globals = {}) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,name+'.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{exports, require:n=>overrides[n] ?? {}, AbortController, __DEV__:false, console,
 setTimeout:(fn,ms)=>{if(ms===3000)queueMicrotask(fn);return 1;}, clearTimeout:()=>{}, ...globals});
 return exports;
}
test('AP status confirms MAC; unrelated/old AP response rejected',async()=>{
 let payload={mode:'ap_provisioning',macAddress:'aa:bb:cc:dd:ee:ff',stationConnected:false};
 const m=load('gateWifiProvisioning',{}, {fetch:async url=>{assert.equal(url,'http://192.168.4.1/status');return {ok:true,json:async()=>payload};}});
 assert.equal((await m.getGateWifiStatus()).macAddress,'AA:BB:CC:DD:EE:FF');
 payload={mode:'ap_provisioning'};await assert.rejects(m.getGateWifiStatus());
});
test('credential bytes, whitespace, request contract and rejected save',async()=>{
 let calls=0, response={result:'ok',restarting:true};
 const m=load('gateWifiProvisioning',{}, {fetch:async(url,init)=>{calls++;assert.equal(url,'http://192.168.4.1/wifi');assert.equal(init.method,'POST');return {ok:true,json:async()=>response};}});
 assert.equal(m.utf8ByteLength('가'.repeat(10)),30);
 await m.sendGateRouterCredentials('a'.repeat(32),'password');
 await m.sendGateRouterCredentials('가'.repeat(10),'');
 await assert.rejects(m.sendGateRouterCredentials('가'.repeat(11),'password'));
 await assert.rejects(m.sendGateRouterCredentials('a'.repeat(33),'password'));
 await assert.rejects(m.sendGateRouterCredentials('farm','short'));
 await assert.rejects(m.sendGateRouterCredentials('farm','가'.repeat(22)));
 assert.equal(calls,2);response={result:'error'};await assert.rejects(m.sendGateRouterCredentials('farm','password'));
 let body;const space=load('gateWifiProvisioning',{}, {fetch:async(u,i)=>{body=JSON.parse(i.body);return{ok:true,json:async()=>({result:'ok'})};}});
 await space.sendGateRouterCredentials(' farm ','password');assert.equal(body.ssid,' farm ');
});
test('save HTTP failure and JSON failure are not success',async()=>{
 for(const fetch of [async()=>({ok:false,status:500}),async()=>({ok:true,json:async()=>{throw Error('truncated');}})]) {
  const m=load('gateWifiProvisioning',{}, {fetch});await assert.rejects(m.sendGateRouterCredentials('farm','password'));
 }
});
