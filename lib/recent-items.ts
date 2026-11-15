import type {SearchHit} from './campaign-search';
type RecentItem=Pick<SearchHit,'kind'|'id'>;
const key=(campaignId:string)=>'waypoint-recent-items:'+campaignId;
export function recentItems(campaignId:string):RecentItem[]{
 try{const value=JSON.parse(localStorage.getItem(key(campaignId))||'[]');return Array.isArray(value)?value.filter(item=>item&&typeof item.id==='string'&&typeof item.kind==='string').slice(0,8):[]}catch{return []}
}
export function rememberItem(campaignId:string,item:RecentItem){
 try{localStorage.setItem(key(campaignId),JSON.stringify([item,...recentItems(campaignId).filter(old=>old.id!==item.id||old.kind!==item.kind)].slice(0,8)))}catch{}
}
