import {test,expect,type Page} from '@playwright/test';
const key='which-lover:usage:v1',windowMs=72*60*60*1000;
async function record(page:Page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key)}
async function seed(page:Page,count:number,startedAt=Date.now()){
 await page.evaluate(({key,count,startedAt})=>localStorage.setItem(key,JSON.stringify({version:1,startedAt,completedCount:count,completedAttempts:Array.from({length:count},(_,i)=>'prior-'+i)})),{key,count,startedAt});await page.reload();
}
async function start(page:Page){await page.getByRole('button',{name:'开始测试',exact:true}).click();await expect(page.getByTestId('question-number')).toHaveText('01 / 36')}
async function answerUntil(page:Page,end=36,background=false){
 for(let i=1;i<=end;i++){
  await expect(page.getByTestId('question-number')).toHaveText(String(i).padStart(2,'0')+' / 36');
  const option=page.getByRole('button',{name:'看情况 / 不确定',exact:true});
  // Background tabs cannot safely compete for native pointer focus in one browser.
  if(background)await option.dispatchEvent('click');else await option.click();
  await page.clock.runFor(230);
 }
}
test('首次开始持久化起点；中途退出、刷新、关闭和重开不扣次数',async({page,context})=>{
 await page.goto('./');expect(await record(page)).toBeNull();const before=Date.now();await start(page);const initial=await record(page);expect(initial.startedAt).toBeGreaterThanOrEqual(before);expect(initial.completedCount).toBe(0);
 await page.getByRole('button',{name:'非常像我',exact:true}).click();await expect(page.getByTestId('question-number')).toHaveText('02 / 36');await page.getByRole('button',{name:'返回首页',exact:true}).click();await start(page);expect(await record(page)).toEqual(initial);
 await page.reload();expect(await record(page)).toEqual(initial);await start(page);await page.close();const next=await context.newPage();await next.goto('./');expect(await record(next)).toEqual(initial);await expect(next.getByRole('status')).toHaveText('剩余3次');
});
test('真实完成3次，第3次显示结果；刷新和重渲染不重复扣次，第4次被阻止',async({page})=>{
 await page.clock.install();await page.goto('./');let startedAt=0;
 for(let count=1;count<=3;count++){
  await start(page);if(!startedAt)startedAt=(await record(page)).startedAt;
  await answerUntil(page);await expect(page.getByRole('heading',{name:'BEDF',exact:true})).toBeVisible();
  expect((await record(page)).completedCount).toBe(count);expect((await record(page)).startedAt).toBe(startedAt);
  await page.evaluate(()=>{dispatchEvent(new Event('focus'));dispatchEvent(new Event('storage'))});await page.clock.runFor(31000);expect((await record(page)).completedCount).toBe(count);
  await page.reload();expect((await record(page)).completedCount).toBe(count);
 }
 await expect(page.getByRole('button',{name:'开始测试',exact:true})).toBeDisabled();await expect(page.getByRole('status')).toContainText('已完成3次');expect((await record(page)).completedAttempts).toHaveLength(3);
});
test('到期立即阻止新测试，不因刷新重新计时；到期前已开始的测试可以完成',async({page})=>{
 const now=Date.now();await page.clock.install({time:now});await page.goto('./');await seed(page,1,now-windowMs+1000);
 await expect(page.getByRole('status')).toHaveText('剩余2次');await page.clock.runFor(1000);
 // A click rechecks the deadline, even before the periodic UI refresh.
 await page.getByRole('button',{name:'开始测试',exact:true}).click();await expect(page.getByRole('status')).toContainText('有效期已结束');await expect(page.getByTestId('question-number')).toHaveCount(0);const state=await record(page);await page.reload();expect(await record(page)).toEqual(state);await expect(page.getByRole('button',{name:'开始测试',exact:true})).toBeDisabled();
 await seed(page,2,now-windowMs+2000);await start(page);await page.clock.runFor(2000);await answerUntil(page);await expect(page.getByRole('heading',{name:'BEDF',exact:true})).toBeVisible();expect((await record(page)).completedCount).toBe(3);
});
test('两个标签页并发完成不覆盖计数，并同步剩余次数',async({page,context})=>{
 await page.clock.install();await page.goto('./');const other=await context.newPage();await other.clock.install();await other.goto('./');
 await start(page);await start(other);expect((await record(page)).startedAt).toBe((await record(other)).startedAt);
 await Promise.all([answerUntil(page,36,true),answerUntil(other,36,true)]);
 for(const p of [page,other]){await expect(p.getByRole('heading',{name:'BEDF',exact:true})).toBeVisible();await expect(p.getByRole('status')).toHaveText('剩余1次');expect((await record(p)).completedCount).toBe(2)}
});
test('只剩1次时两个标签页同时完成，至多1个新增结果，其他页明确提示次数耗尽',async({page,context})=>{
 await page.clock.install();await page.goto('./');await seed(page,2);const other=await context.newPage();await other.clock.install();await other.goto('./');
 await start(page);await start(other);await Promise.all([answerUntil(page,36,true),answerUntil(other,36,true)]);
 await expect.poll(async()=>await page.locator('.result').count()+await other.locator('.result').count()).toBe(1);
 expect((await record(page)).completedCount).toBe(3);await expect(page.getByRole('status')).toContainText('已完成3次');await expect(other.getByRole('status')).toContainText('已完成3次');
});
for(const mode of ['read','write','silent','locks','corrupt'])test('不可用或异常时明确阻止：'+mode,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({mode,key})=>{
  if(mode==='read')Storage.prototype.getItem=()=>{throw Error('blocked')};
  if(mode==='write')Storage.prototype.setItem=()=>{throw Error('quota exceeded')};
  if(mode==='silent')Storage.prototype.setItem=()=>{};
  if(mode==='locks')Object.defineProperty(navigator,'locks',{value:undefined});
  if(mode==='corrupt')localStorage.setItem(key,'{');
 },{mode,key});await page.goto('./');await expect(page.getByRole('button',{name:'开始测试',exact:true})).toBeDisabled();await expect(page.getByRole('status')).toContainText(mode==='corrupt'?'记录异常':'无法使用');expect(errors).toEqual([]);
});
test('答题中途存储失效：不报运行错误、不放行未计数结果',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.clock.install();await page.goto('./');await start(page);await answerUntil(page,35);
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('denied')}});await page.getByRole('button',{name:'看情况 / 不确定',exact:true}).click();await page.clock.runFor(230);
 await expect(page.getByRole('status')).toContainText('无法使用');await expect(page.locator('.result')).toHaveCount(0);expect((await record(page)).completedCount).toBe(0);expect(errors).toEqual([]);
});
test('375、390、430px及桌面：首页、答题、结果、到期和存储提示无溢出',async({page})=>{
 await page.clock.install();await page.goto('./');
 const check=async(label:string)=>{for(const width of [375,390,430,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/usage-'+label+'-'+width+'.png',fullPage:true})}};
 await check('home');await start(page);await check('quiz');await answerUntil(page);await expect(page.locator('.result')).toBeVisible();await check('result');
 await page.reload();await seed(page,1,Date.now()-windowMs-1000);await expect(page.getByRole('status')).toContainText('有效期已结束');await check('expired');
 await page.evaluate(()=>{Storage.prototype.getItem=()=>{throw Error('denied')};dispatchEvent(new Event('focus'))});await expect(page.getByRole('status')).toContainText('无法使用');await check('storage');
});
