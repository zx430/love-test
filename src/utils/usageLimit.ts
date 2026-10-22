// Local browser allowance only. Answers and personality results are never stored.
export const USAGE_KEY='which-lover:usage:v1';
export const USAGE_WINDOW=72*60*60*1000;
export interface UsageRecord {version:1;startedAt:number;completedCount:number;completedAttempts:string[]}
export interface UsageAttempt {id:string;startedAt:number}
export interface UsageStatus {allowed:boolean;remaining:number;message:string}
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
interface Dependencies {
 storage:()=>Store;
 lock:<T>(work:()=>T|Promise<T>)=>Promise<T>;
 supported:()=>boolean;
 now:()=>number;
 id:()=>string;
}
const unavailable='无法使用浏览器本地存储或安全计数，暂不能开始测试。请允许本地存储并使用支持的浏览器。';
const invalid='本地测试次数记录异常，暂不能开始新的测试。';
const exhausted='已完成3次测试，不能再开始新的测试。';
const expired='72小时有效期已结束，不能再开始新的测试。';
export class UsageError extends Error {}
export function usageMessage(error:unknown){return error instanceof UsageError?error.message:unavailable}
export function createUsageLimiter(deps:Dependencies){
 function read():UsageRecord|null{
  const raw=deps.storage().getItem(USAGE_KEY);if(raw===null)return null;
  let state:UsageRecord;try{state=JSON.parse(raw)}catch{throw new UsageError(invalid)}
  if(!state||state.version!==1||!Number.isFinite(state.startedAt)||state.startedAt<=0||!Number.isInteger(state.completedCount)||state.completedCount<0||state.completedCount>3||!Array.isArray(state.completedAttempts)||state.completedAttempts.length!==state.completedCount||state.completedAttempts.some(id=>typeof id!=='string'||!id)||new Set(state.completedAttempts).size!==state.completedCount)throw new UsageError(invalid);
  return state;
 }
 function writable(){
  if(!deps.supported())throw new UsageError(unavailable);
  const store=deps.storage(),key=USAGE_KEY+':probe:'+deps.id();
  try{store.setItem(key,'1');if(store.getItem(key)!=='1')throw new UsageError(unavailable)}finally{store.removeItem(key)}
 }
 function canStart(state:UsageRecord|null){
  if(!state)return;
  if(deps.now()<state.startedAt)throw new UsageError(invalid);
  if(deps.now()-state.startedAt>=USAGE_WINDOW)throw new UsageError(expired);
  if(state.completedCount>=3)throw new UsageError(exhausted);
 }
 function write(state:UsageRecord){const raw=JSON.stringify(state);deps.storage().setItem(USAGE_KEY,raw);if(deps.storage().getItem(USAGE_KEY)!==raw)throw new UsageError(unavailable)}
 return {
  inspect():UsageStatus{
   try{writable();const state=read();canStart(state);const remaining=3-(state?.completedCount??0);return {allowed:true,remaining,message:`剩余${remaining}次`}}
   catch(error){return {allowed:false,remaining:0,message:usageMessage(error)}}
  },
  async start():Promise<UsageAttempt>{
   return deps.lock(()=>{writable();let state=read();canStart(state);if(!state){state={version:1,startedAt:deps.now(),completedCount:0,completedAttempts:[]};write(state)}return {id:deps.id(),startedAt:state.startedAt}});
  },
  async complete(attempt:UsageAttempt):Promise<void>{
   return deps.lock(()=>{
    writable();const state=read();
    if(!state||state.startedAt!==attempt.startedAt)throw new UsageError(invalid);
    // The same result can only consume one allowance, even if completion is retried.
    if(state.completedAttempts.includes(attempt.id))return;
    if(state.completedCount>=3)throw new UsageError(exhausted);
    // An attempt admitted before expiry may finish; expiry blocks new starts only.
    write({...state,completedCount:state.completedCount+1,completedAttempts:[...state.completedAttempts,attempt.id]});
   });
  }
 };
}
export const usageLimiter=createUsageLimiter({
 storage:()=>window.localStorage,
 supported:()=>typeof navigator.locks?.request==='function'&&typeof globalThis.crypto?.randomUUID==='function',
 lock:work=>{if(!navigator.locks?.request)return Promise.reject(new UsageError(unavailable));return navigator.locks.request(USAGE_KEY,work)},
 now:()=>Date.now(),id:()=>crypto.randomUUID()
});
