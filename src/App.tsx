import {useEffect,useRef,useState} from 'react';
import {questions} from './data/questions';
import {score} from './utils/scoring';
import ResultPage from './components/ResultPage';
const options=['完全不像我','比较不像我','看情况 / 不确定','比较像我','非常像我'];
type Attempt={answers:(number|null)[];index:number;complete:boolean};
const newAttempt=():Attempt=>({answers:Array(36).fill(null),index:0,complete:false});
export default function App(){
 const [attempt,setAttempt]=useState(newAttempt);const [view,setView]=useState<'home'|'test'|'result'>('home');const [busy,setBusy]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const busyRef=useRef(false);const heading=useRef<HTMLHeadingElement>(null);
 function navigate(next:'home'|'test'|'result'){cancel();if(next==='home')setAttempt(newAttempt());setView(next);window.scrollTo(0,0)}
 function cancel(){if(timer.current)clearTimeout(timer.current);busyRef.current=false;setBusy(false)}
 function start(){setAttempt(newAttempt());navigate('test')}
 function answer(value:number){if(busyRef.current)return;busyRef.current=true;setBusy(true);const answers=[...attempt.answers];answers[attempt.index]=value;setAttempt({...attempt,answers});timer.current=setTimeout(()=>{const next=attempt.index+1;if(next===36){if(answers.some(a=>a===null)){setAttempt({answers,index:answers.indexOf(null),complete:false})}else{setAttempt({answers,index:35,complete:true});navigate('result')}}else setAttempt({answers,index:next,complete:false});busyRef.current=false;setBusy(false)},200)}
 function previous(){cancel();setAttempt({...attempt,index:Math.max(0,attempt.index-1),complete:false})}
 useEffect(()=>{
  // Delete the legacy cache only; never read it or write any current answers.
  try{window.localStorage.removeItem('which-lover:v1')}catch{}
  const reset=()=>{cancel();setAttempt(newAttempt());setView('home');history.replaceState(null,'',location.pathname);window.scrollTo(0,0)};
  const onShow=(event:PageTransitionEvent)=>{if(event.persisted)reset()};
  reset();window.addEventListener('pagehide',reset);window.addEventListener('pageshow',onShow);window.addEventListener('popstate',reset);window.addEventListener('hashchange',reset);
  return()=>{window.removeEventListener('pagehide',reset);window.removeEventListener('pageshow',onShow);window.removeEventListener('popstate',reset);window.removeEventListener('hashchange',reset);if(timer.current)clearTimeout(timer.current)};
 },[]);
 useEffect(()=>{if(view==='test')heading.current?.focus()},[attempt.index,view]);
 useEffect(()=>{
  type Tool={name:string;description:string;inputSchema:object;execute:(input:unknown)=>Promise<unknown>;annotations:{readOnlyHint:boolean}};
  const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>unknown}}).modelContext;
  if(!context?.registerTool||view!=='test')return;const lifecycle=new AbortController();
  try{Promise.resolve(context.registerTool({name:'answer_current_relationship_scene',description:'为当前可见的亲密关系场景选择 1–5 的答案并自动继续。仅按用户指定的答案操作，不推测用户的感受。',inputSchema:{type:'object',properties:{answer:{type:'integer',minimum:1,maximum:5}},required:['answer'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{const a=(input as {answer?:unknown})?.answer;if(!Number.isInteger(a)||Number(a)<1||Number(a)>5)throw new Error('答案必须为 1–5 的整数');if(busyRef.current)throw new Error('正在切换题目');answer(Number(a));await new Promise(resolve=>setTimeout(resolve,240));return {answeredQuestion:attempt.index+1,accepted:true}}},{signal:lifecycle.signal})).catch(()=>{})}catch{}
  return()=>lifecycle.abort();
 },[view,attempt]);
 useEffect(()=>{document.title=view==='result'&&attempt.complete?`${score(attempt.answers as number[]).code}｜你是哪一种恋人？`:'你是哪一种恋人？｜亲密关系人格测试'},[view,attempt.complete]);
 const count=attempt.answers.filter(a=>a!==null).length;
 return <><header className="site-header">{view==='result'?<span className="brand"><img src="./favicon.svg" alt=""/>你是哪一种恋人？</span>:<a className="brand" href="#" onClick={event=>{event.preventDefault();navigate('home')}}><img src="./favicon.svg" alt=""/>你是哪一种恋人？</a>}<span>一份关于亲密的自我观察</span></header>
 {view==='home'?<main className="home"><section className="landing"><div className="eyebrow">THE WAY WE LOVE · 亲密关系互动风格测试</div><div className="orbit" aria-hidden="true"><i/><i/><span>靠近，也看见自己。</span></div><h1>你是哪一种<br/><em>恋人？</em></h1><p className="lead">36 个亲密关系场景，<br/>看见你如何靠近、表达、冲突与确认爱。</p><button className="primary" onClick={start}>开始测试</button></section></main>
 :view==='test'?<main className="quiz"><div className="quiz-top"><button className="text-button" onClick={()=>navigate('home')}>返回首页</button><span data-testid="question-number">{String(attempt.index+1).padStart(2,'0')} / 36</span></div><div className="progress" role="progressbar" aria-label="已答题目" aria-valuemin={0} aria-valuemax={36} aria-valuenow={count}><span style={{width:`${count/36*100}%`}}/></div><p className="question-hint">想象一下，你真正喜欢上一个人之后。</p><section className="question" key={attempt.index}><span className="question-index">SCENE {String(attempt.index+1).padStart(2,'0')}</span><h1 ref={heading} tabIndex={-1}>{questions[attempt.index].text}</h1><div className="options" aria-label="选择与你最相近的答案">{options.map((label,i)=><button key={label} disabled={busy} aria-pressed={attempt.answers[attempt.index]===i+1} onClick={()=>answer(i+1)}><span className="option-number" aria-hidden="true">{attempt.answers[attempt.index]===i+1?'✓':String(i+1).padStart(2,'0')}</span><span>{label}</span><span className="option-circle" aria-hidden="true"/></button>)}</div></section><div className="quiz-bottom"><button className="text-button" disabled={attempt.index===0||busy} onClick={previous}>上一题</button><span>选择后自动继续 · 仅本次有效</span></div><p className="privacy-small">答案没有好坏，请按你的真实感受选择。</p></main>
 :<ResultPage result={score(attempt.answers as number[])} code={score(attempt.answers as number[]).code}/>}</>
}
export function Disclaimer(){return <footer>本测试用于帮助你观察自己在亲密关系中的互动倾向，不构成心理诊断或专业建议。<br/>你的答案仅在本次页面运行期间使用，不会保存或上传至服务器。</footer>}
