import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUsageLimiter,USAGE_KEY,USAGE_WINDOW,type UsageRecord} from '../src/utils/usageLimit';
function setup(){
 const data=new Map<string,string>();let time=1700000000000,id=0,queue=Promise.resolve();
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)},removeItem:(key:string)=>{data.delete(key)}};
 const deps={storage:()=>storage,supported:()=>true,now:()=>time,id:()=>String(++id),lock:<T>(work:()=>T|Promise<T>):Promise<T>=>{const result=queue.then(work);queue=result.then(()=>{},()=>{});return result}};
 const limiter=createUsageLimiter(deps);
 return {limiter,deps,data,storage,time:(value:number)=>{time=value},now:()=>time,record:()=>JSON.parse(data.get(USAGE_KEY)!) as UsageRecord};
}
test('仅首次正式开始记录起点，重复开始和新实例均不重置、不扣次数',async()=>{
 const s=setup();assert.equal(s.limiter.inspect().remaining,3);assert.equal(s.data.has(USAGE_KEY),false);
 const first=await s.limiter.start();s.time(s.now()+1000);await s.limiter.start();await createUsageLimiter(s.deps).start();
 assert.equal(s.record().startedAt,first.startedAt);assert.equal(s.record().completedCount,0);
});
test('72小时内依次完成3次，第3次正常完成，第4次无法开始',async()=>{
 const s=setup();for(let i=1;i<=3;i++){const a=await s.limiter.start();await s.limiter.complete(a);assert.equal(s.record().completedCount,i)}
 assert.equal(s.limiter.inspect().allowed,false);await assert.rejects(s.limiter.start(),/已完成3次/);
});
test('相同结果重复或并发回调仅扣一次，重新读取不扣次数',async()=>{
 const s=setup(),a=await s.limiter.start();await Promise.all([s.limiter.complete(a),s.limiter.complete(a),s.limiter.complete(a)]);
 assert.equal(s.record().completedCount,1);assert.equal(createUsageLimiter(s.deps).inspect().remaining,2);assert.equal(s.record().completedCount,1);
});
test('72小时边界到期，不自动重开；到期前开始的测试允许完成',async()=>{
 const s=setup(),a=await s.limiter.start();s.time(a.startedAt+USAGE_WINDOW-1);assert.equal(s.limiter.inspect().allowed,true);
 s.time(a.startedAt+USAGE_WINDOW);assert.equal(s.limiter.inspect().allowed,false);await assert.rejects(s.limiter.start(),/有效期已结束/);
 await s.limiter.complete(a);assert.equal(s.record().completedCount,1);s.time(s.now()+USAGE_WINDOW);await assert.rejects(s.limiter.start(),/有效期已结束/);assert.equal(s.record().startedAt,a.startedAt);
});
test('中途退出或多次开始不扣次数',async()=>{
 const s=setup();for(let i=0;i<10;i++)await s.limiter.start();assert.equal(s.record().completedCount,0);assert.equal(s.limiter.inspect().remaining,3);
});
test('跨实例并发完成使用共享锁，不丢计数、不超过3次',async()=>{
 const s=setup(),other=createUsageLimiter(s.deps);const tokens=await Promise.all([s.limiter.start(),other.start(),s.limiter.start(),other.start()]);
 const results=await Promise.allSettled(tokens.map((token,i)=>(i%2?other:s.limiter).complete(token)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.equal(s.record().completedCount,3);assert.equal(new Set(s.record().completedAttempts).size,3);
});
test('并发首次开始共享同一起点',async()=>{
 const s=setup();const attempts=await Promise.all(Array.from({length:8},()=>createUsageLimiter(s.deps).start()));
 assert.equal(new Set(attempts.map(a=>a.startedAt)).size,1);assert.equal(new Set(attempts.map(a=>a.id)).size,8);assert.equal(s.record().completedCount,0);
});
test('存储读取失败、写入失败、静默丢弃和不支持安全锁均明确阻止开始',async()=>{
 for(const mode of ['read','write','silent','unsupported']){
  const s=setup();if(mode==='read')s.storage.getItem=()=>{throw Error('denied')};if(mode==='write')s.storage.setItem=()=>{throw Error('quota')};if(mode==='silent')s.storage.setItem=()=>{};if(mode==='unsupported')s.deps.supported=()=>false;
  assert.equal(s.limiter.inspect().allowed,false);assert.match(s.limiter.inspect().message,/无法使用/);await assert.rejects(s.limiter.start());
 }
});
test('损坏或不一致记录不静默重置，异常时钟不开放新测试',async()=>{
 for(const raw of ['{','null','{}',JSON.stringify({version:1,startedAt:1,completedCount:2,completedAttempts:['a']})]){
  const s=setup();s.data.set(USAGE_KEY,raw);assert.equal(s.limiter.inspect().allowed,false);await assert.rejects(s.limiter.start());assert.equal(s.data.get(USAGE_KEY),raw);
 }
 const s=setup(),a=await s.limiter.start();s.time(a.startedAt-1);assert.equal(s.limiter.inspect().allowed,false);
});
test('开始后记录丢失或写入失败不放行结果',async()=>{
 const s=setup(),a=await s.limiter.start();s.data.delete(USAGE_KEY);await assert.rejects(s.limiter.complete(a));
 const t=setup(),b=await t.limiter.start();t.storage.setItem=()=>{throw Error('quota')};await assert.rejects(t.limiter.complete(b));assert.equal(t.record().completedCount,0);
});
