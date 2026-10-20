import {profiles} from '../data/profiles';
import {animals,animalImage,type Pairing} from '../data/pairings';
export default function PairingSection({title,kind,items}:{title:string;kind:'compatible'|'challenging';items:Pairing[]}){
 return <section className={'pairing-section '+kind} aria-label={title}><div className="section-heading"><h2>{title}</h2></div><div className="pairing-list">{items.map(item=><article className="pairing-card" key={item.code} data-code={item.code}><img src={animalImage(item.code)} alt={animals[item.code]} width={1122} height={1402} loading="lazy"/><div><span className="pairing-code">{item.code}</span><h3>{profiles[item.code].name}</h3><p>{item.reason}</p></div></article>)}</div></section>
}
