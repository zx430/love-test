import {test,expect} from '@playwright/test';
import {pairings,animals} from '../src/data/pairings';
import {profiles} from '../src/data/profiles';
import {questions} from '../src/data/questions';
import fs from 'node:fs';
import path from 'node:path';


const expected:Record<string,string[]>={
BEDF:['BCDF BEPF BEDA','ICPA ICPF IEPA'],BEDA:['BCDA BEPA BEDF','ICPF ICPA IEPF'],BEPF:['BCPF BEDF BEPA','ICDA ICDF IEDA'],BEPA:['BCPA BEDA BEPF','ICDF ICDA IEDF'],
BCDF:['BEDF BCDA ICDF','IEPA ICPA IEPF'],BCDA:['BEDA BCDF ICDA','IEPF ICPF IEPA'],BCPF:['BEPF BCPA ICPF','IEDA ICDA IEDF'],BCPA:['BEPA BCPF ICPA','IEDF ICDF IEDA'],
IEDF:['ICDF IEPF IEDA','BCPA BCPF BEPA'],IEDA:['ICDA IEPA IEDF','BCPF BCPA BEPF'],IEPF:['ICPF IEDF IEPA','BCDA BCDF BEDA'],IEPA:['ICPA IEDA IEPF','BCDF BCDA BEDF'],
ICDF:['IEDF ICDA BCDF','BEPA BCPA BEPF'],ICDA:['IEDA ICDF BCDA','BEPF BCPF BEPA'],ICPF:['IEPF ICPA BCPF','BEDA BCDA BEDF'],ICPA:['IEPA ICPF BCPA','BEDF BCDF BEDA']};
test('固定数据完整性、96条理由与原图完整性',()=>{
 expect(Object.keys(pairings).sort()).toEqual(Object.keys(profiles).sort());expect(Object.keys(animals)).toHaveLength(16);
 for(const [code,row] of Object.entries(pairings)){
 const all=[...row.compatible,...row.challenging];expect(new Set(all.map(x=>x.code)).size).toBe(6);
 [row.compatible,row.challenging].forEach((list,i)=>{expect(list.map(x=>x.code)).toEqual(expected[code][i].split(' '));expect(list).toHaveLength(3);for(const item of list){expect(profiles[item.code]).toBeTruthy();expect(item.code).not.toBe(code);expect(item.reason.length).toBeGreaterThanOrEqual(20);expect(item.reason.length).toBeLessThanOrEqual(45)}});
 const manifest=JSON.parse(fs.readFileSync('public/animals/manifest.json','utf8'));
 const image=fs.readFileSync('public/animals/'+code+'.png');
 expect(image.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 expect(image.readUInt32BE(16)).toBe(manifest[code].width);
 expect(image.readUInt32BE(20)).toBe(manifest[code].height);
 // Optional byte-for-byte source verification without a machine-specific path.
 if(process.env.PERSONALITY_ORIGINALS_DIR){expect(image.equals(fs.readFileSync(path.join(process.env.PERSONALITY_ORIGINALS_DIR,manifest[code].file)))).toBe(true)}
 }
});
for(const code of Object.keys(expected))test(code+' 完整36题、六张推荐卡与四种宽度',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');await page.getByRole('button',{name:'开始测试',exact:true}).click();
 for(let i=0;i<questions.length;i++){
 await expect(page.getByTestId('question-number')).toHaveText(String(i+1).padStart(2,'0')+' / 36');
 const q=questions[i];const forward='BEDF'[q.dimension]===code[q.dimension];
 await page.getByRole('button',{name:forward===q.forward?'非常像我':'完全不像我',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:code,exact:true})).toBeVisible();
 await expect(page.locator('.axis')).toHaveCount(4);await expect(page.locator('.deep-grid article')).toHaveCount(6);
 for(const [kind,index] of [['compatible',0],['challenging',1]] as const){
 const cards=page.locator('.'+kind+' .pairing-card');expect(await cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-code')))).toEqual(expected[code][index].split(' '));
 for(let i=0;i<3;i++){const item=pairings[code][kind][i];await expect(cards.nth(i).locator('h3')).toHaveText(profiles[item.code].name);await expect(cards.nth(i).locator('p')).toHaveText(item.reason);await expect(cards.nth(i).locator('img')).toHaveAttribute('src','/love-test/animals/'+item.code+'.png')}
 }
 for(const width of [375,390,430,1280]){
 await page.setViewportSize({width,height:900});await page.locator('.pairing-note').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.locator('.result img').evaluateAll(images=>images.every(im=>(im as HTMLImageElement).complete&&(im as HTMLImageElement).naturalWidth===1122))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.locator('.pairing-card').evaluateAll(cards=>cards.every(card=>{const img=card.querySelector('img')!.getBoundingClientRect();const text=card.querySelector('div')!.getBoundingClientRect();return img.right<=text.left&&card.scrollWidth<=card.clientWidth}))).toBe(true);
 if(code==='BEDF'||code==='ICPA'){await page.screenshot({path:'test-results/upgrade-'+code+'-'+width+'.png',fullPage:true})}
 }
 expect(errors).toEqual([]);
});
