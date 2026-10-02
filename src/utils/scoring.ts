import { questions } from '../data/questions';
export const dimensions = [
 { first:'B',second:'I',left:'连接',right:'独立',topic:'靠近的距离',a:'你更容易通过持续分享和陪伴感到彼此相连。',b:'你更愿意在亲密关系里保留个人节奏与空间。'},
 { first:'E',second:'C',left:'外显',right:'内蕴',topic:'表达的方式',a:'你更愿意让喜欢、需求与脆弱被对方直接看见。',b:'你更习惯先整理自己的感受，再决定如何表达。'},
 { first:'D',second:'P',left:'直面',right:'缓冲',topic:'冲突的节奏',a:'重要问题悬而未决时，你更希望尽早展开沟通。',b:'情绪升高时，你更希望先缓一缓，再回来处理问题。'},
 { first:'F',second:'A',left:'共鸣',right:'行动',topic:'确认爱的线索',a:'被理解、被看见和深度交流更容易让你确认爱。',b:'可靠的出现、照顾与共同承担更容易让你确认爱。'}
];
export function strength(p:number){const n=Math.round(p);return n<=56?'接近平衡':n<=65?'轻度倾向':n<=78?'明显倾向':n<=89?'强烈倾向':'高度典型'}
export function clarityName(n:number){return n<=6?'流动型':n<=14?'混合型':n<=24?'清晰型':'鲜明型'}
export function score(answers:number[]){
 if(answers.length!==36||Array.from(answers).some(a=>!Number.isInteger(a)||a<1||a>5))throw new Error('请先完成全部 36 道题。');
 const axes=dimensions.map((d,index)=>{
  const values=questions.filter(q=>q.dimension===index).map(q=>q.forward?answers[q.id-1]-3:3-answers[q.id-1]);
  const sum=values.reduce((a,b)=>a+b,0); const first=50+sum/values.length*25;
  let side=sum>0;
  if(sum===0){side=true;for(const magnitude of [2,1]){const balance=values.filter(v=>v===magnitude).length-values.filter(v=>v===-magnitude).length;if(balance){side=balance>0;break}}}
  const dominant=side?first:100-first;
  return {...d,firstPercent:first,secondPercent:100-first,letter:side?d.first:d.second,label:side?d.left:d.right,dominant,strength:strength(dominant),description:(side?d.a:d.b)+(dominant<=56?' 这一维度对你来说比较流动，具体表现很可能随着关系状态和对象而变化；两种方式都可能出现。':dominant>80?' 这是你非常明显的一项关系倾向。':' 这是一种偏好，也为另一种方式保留了空间。')};
 });
 const clarity=axes.reduce((n,a)=>n+Math.abs(a.firstPercent-50),0)/4;
 return {axes,code:axes.map(a=>a.letter).join(''),clarity,clarityLabel:clarityName(clarity)};
}
export type Result=ReturnType<typeof score>;
