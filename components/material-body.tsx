import {responseSections} from '../lib/response-sections';
import InlineMarks from './inline-marks';
export default function MaterialBody({body}:{body:string}){return <div className="material-body">{responseSections(body).map((section,i)=>section.label?<section className={'response-section '+(section.label==='IF THEY FAIL'?'response-cost':'')} key={i}><h4>{section.label}</h4><p><InlineMarks text={section.text}/></p></section>:<div className="prose card-prose" key={i}><InlineMarks text={section.text}/></div>)}</div>}
