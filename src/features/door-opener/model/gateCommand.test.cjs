const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, overrides = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => overrides[name] ?? load(path.resolve(path.dirname(file), name + '.ts')), setTimeout: fn => fn(), Date, console });
  return exports;
}
const { buildGateCommand } = load(path.join(__dirname, 'gateCommand.ts'));
const mac = 'AA:BB:CC:DD:EE:FF';
const card = { title: '열기', mode: 'open_now' };
test('online envelope is PR194, without cancellation or lossy COUNT conversion', () => {
  const result = buildGateCommand({ title: '99', mode: 'count_control', countControl: {
    low: 0, high: 99, repeatDays: { sun:false,mon:true,tue:false,wed:false,thu:false,fri:false,sat:false },
    timeWindowStart: '09:30', timeWindowEnd:'24:00', within:{entranceOpen:true,exitOpen:true}, above:{entranceOpen:false,exitOpen:true},
  } }, mac.toLowerCase());
  assert.equal(result.gateId, mac);
  assert.equal(result.payload.countRange.high,99);
  assert.equal(result.payload.timeWindow.start,'09:30');
  assert.equal(result.payload.days.join(','),'mon');
  assert.equal('operation' in result,false);
  assert.throws(()=>buildGateCommand({title:'방제',mode:'lock_days',start:'3'},mac));
});
test('POST numeric ID once, poll same command until SUCCESS', async () => {
  const calls=[]; let poll=0;
  const api={post:async(...args)=>{calls.push(args);return {data:{data:{commandId:'cmd-1',status:'PENDING'}}};},get:async(...args)=>{calls.push(args);return {data:{data:{commandId:'cmd-1',status:++poll===1?'PENDING':'SUCCESS'}}};}};
  const { executeGateCard }=load(path.join(__dirname,'../api/gateCommandsApi.ts'),{'@/lib/api':{api}});
  assert.equal((await executeGateCard({gateId:42,macAddress:mac},card)).status,'SUCCESS');
  assert.equal(calls[0][0],'/api/v1/gates/42/commands');
  assert.equal(calls[0][1].gateId,mac);
  assert.equal(calls[1][0],'/api/v1/gates/42/commands/cmd-1');
  assert.equal(calls.length,3);
});
test('failure, timeout and lost POST responses never become success or automatic re-execution', async () => {
  for(const status of ['FAILED','TIMEOUT','WRONG_ID','NETWORK']) {
    let posts=0;
    const api={post:async()=>{posts++;if(status==='NETWORK')throw Error('network');return {data:{data:{commandId:'x',status:'PENDING'}}};},get:async()=>({data:{data:{commandId:status==='WRONG_ID'?'other':'x',status:status==='WRONG_ID'?'SUCCESS':status}}})};
    const {executeGateCard}=load(path.join(__dirname,'../api/gateCommandsApi.ts'),{'@/lib/api':{api}});
    await assert.rejects(executeGateCard({gateId:42,macAddress:mac},card));
    assert.equal(posts,1);
  }
});

test('server null wrapper is no current command, invalid records are not cancellable', async () => {
  for (const value of [null, {}]) {
    const api = { get: async () => ({ data: { data: value } }) };
    const client = load(path.join(__dirname, '../api/gateCommandsApi.ts'), { '@/lib/api': { api } });
    assert.equal(await client.getCurrentGateCommand({ gateId: 42 }), null);
  }
  for (const value of [undefined, [], { commandId: 'x' }, { commandId: 'x', executionStatus: 'CANCELLED', title: 'old' }]) {
    const api = { get: async () => ({ data: { data: value } }) };
    const client = load(path.join(__dirname, '../api/gateCommandsApi.ts'), { '@/lib/api': { api } });
    await assert.rejects(client.getCurrentGateCommand({ gateId: 42 }));
  }
});

test('temporary result read failures recover without issuing the command twice', async () => {
  let posts = 0, reads = 0;
  const api = {
    post: async () => { posts++; return { data: { data: { commandId: 'x' } } }; },
    get: async () => {
      reads++;
      if (reads === 1) throw Error('network interrupted');
      if (reads === 2) throw { response: { status: 503 } };
      return { data: { data: { commandId: 'x', status: 'SUCCESS', detail: 'SERVO_DEFERRED' } } };
    },
  };
  const client = load(path.join(__dirname, '../api/gateCommandsApi.ts'), { '@/lib/api': { api } });
  const result = await client.executeGateCard({ gateId: 42, macAddress: mac }, card);
  assert.equal(result.detail, 'SERVO_DEFERRED');
  assert.equal(posts, 1); assert.equal(reads, 3);
});

test('authorization failures and unknown statuses stop polling', async () => {
  for (const forbidden of [true, false]) {
    let reads = 0;
    const api = {
      post: async () => ({ data: { data: { commandId: 'x' } } }),
      get: async () => { reads++; if (forbidden) throw { response: { status: 403 } }; return { data: { data: { commandId: 'x', status: 'UNKNOWN' } } }; },
    };
    const client = load(path.join(__dirname, '../api/gateCommandsApi.ts'), { '@/lib/api': { api } });
    await assert.rejects(client.executeGateCard({ gateId: 42, macAddress: mac }, card));
    assert.equal(reads, 1);
  }
});

test('invalid cancellation target never reaches the server', async () => {
  let posts = 0;
  const api = { post: async () => { posts++; } };
  const client = load(path.join(__dirname, '../api/gateCommandsApi.ts'), { '@/lib/api': { api } });
  for (const target of [undefined, '', '   ']) await assert.rejects(client.cancelGateCommand({ gateId: 42, macAddress: mac }, target));
  assert.equal(posts, 0);
});

test('connection lookup validates server data and preserves unsupported endpoint errors', async () => {
  let data = { isConnected: false, lastConnectedAt: null };
  const api = { get: async () => ({ data: { data } }) };
  const client = load(path.join(__dirname, '../api/gateCommandsApi.ts'), { '@/lib/api': { api } });
  assert.equal((await client.getGateConnection({ gateId: 42 })).isConnected, false);
  data = {};
  await assert.rejects(client.getGateConnection({ gateId: 42 }));
  const missing = { response: { status: 404 } };
  api.get = async () => { throw missing; };
  await assert.rejects(client.getGateConnection({ gateId: 42 }), error => error === missing);
});
