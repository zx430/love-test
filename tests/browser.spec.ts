import {test,expect,type Page} from '@playwright/test';
const start=async(p:Page)=>{await expect(p.getByRole('button',{name:'开始测试',exact:true})).toBeVisible();await p.getByRole('button',{name:'开始测试',exact:true}).click();await expect(p.getByTestId('question-number')).toHaveText('01 / 36');await expect(p.locator('[aria-pressed=true]')).toHaveCount(0)};
test('旧缓存不恢复、刷新清空、重新打开清空、返回首页重新开始',async({page,context})=>{
 await page.goto('/');await page.evaluate(()=>{localStorage.setItem('which-lover:v1',JSON.stringify({answers:Array(36).fill(5),index:35,complete:true}));localStorage.setItem('unrelated','keep')});await page.goto('/#result?type=BCPF');await page.reload();await expect(page.getByRole('button',{name:'开始测试',exact:true})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('which-lover:v1'))).toBeNull();expect(await page.evaluate(()=>localStorage.getItem('unrelated'))).toBe('keep');
 await start(page);await page.getByRole('button',{name:'非常像我',exact:true}).click();await expect(page.getByTestId('question-number')).toHaveText('02 / 36');await page.reload();await start(page);await page.getByRole('button',{name:'比较像我',exact:true}).click();await expect(page.getByTestId('question-number')).toHaveText('02 / 36');await page.getByRole('button',{name:'返回首页',exact:true}).click();await start(page);
 await page.close();const p=await context.newPage();await p.goto('/#test');await start(p);expect(await p.evaluate(()=>localStorage.getItem('which-lover:v1'))).toBeNull();await p.reload();expect(await p.locator('body').innerText()).not.toMatch(/查看我的结果|继续测试|恢复测试|历史结果|上次测试|自动保存/);
});
test('可改上一题、结果刷新清空、响应式报告正常',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');for(const width of [375,390,430,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}await start(page);
 await page.getByRole('button',{name:'非常像我',exact:true}).click();await expect(page.getByTestId('question-number')).toHaveText('02 / 36');await page.getByRole('button',{name:'上一题',exact:true}).click();await expect(page.getByRole('button',{name:'非常像我',exact:true})).toHaveAttribute('aria-pressed','true');
 for(let i=0;i<36;i++){await page.getByRole('button',{name:'看情况 / 不确定',exact:true}).click();if(i<35)await expect(page.getByTestId('question-number')).toHaveText(`${String(i+2).padStart(2,'0')} / 36`)}await expect(page.getByRole('heading',{name:'BEDF',exact:true})).toBeVisible();await expect(page.getByText('你的恋爱人格呈现较高流动性。')).toBeVisible();await expect(page.locator('button,a,dialog')).toHaveCount(0);await expect(page.locator('.axis')).toHaveCount(4);
 for(const width of [375,390,430,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
 await page.reload();await start(page);expect(errors).toEqual([]);
});
