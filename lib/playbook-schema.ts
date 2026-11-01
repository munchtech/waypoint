import {z} from 'zod';

// Stored shapes for playbooks, party rosters, the memory ledger and the bargain log. Logic lives in playbook.ts.
const text=(max=6000)=>z.string().max(max);
const value=z.union([z.string().max(80),z.number()]);
export const condSchema=z.object({flag:text(80),in:z.array(text(80)).max(20).optional(),not:z.array(text(80)).max(20).optional(),min:z.number().optional(),max:z.number().optional()});
export const effectSchema=z.object({flag:text(80),set:text(80).optional(),add:z.number().optional()});
// Optional fields a session path (Branch) can carry when it comes from a playbook.
export const playFields={origin:z.enum(['playbook','ai','dm']).optional(),scene:text(160).optional(),tells:text().optional(),rules:text().optional(),later:text().optional(),keywords:text(1000).optional(),when:z.array(condSchema).max(12).optional(),effects:z.array(effectSchema).max(12).optional()};
export const playSchema=z.object({id:text(120),title:text(300),style:z.enum(['Roleplay','Exploration','Combat','Mischief']),likelihood:text(120),why:text(),readAloud:text(),response:text(),consequence:text(),fallback:text(),...playFields});
const flagSchema=z.object({id:text(80),label:text(160),group:text(80),initial:value,options:z.array(z.object({id:text(80),label:text(160)})).max(30).optional(),max:z.number().optional(),help:text(600).optional(),thresholds:z.array(z.object({at:z.number(),text:text(600)})).max(6).optional()});
const creatureSchema=z.object({name:text(160),statblock:text(80).optional(),base:text(160),cr:text(8),count:z.number().int().min(1).max(40)});
const encounterSchema=z.object({id:text(120),sessionId:text(120).optional(),title:text(200),creatures:z.array(creatureSchema).min(1).max(12),tactics:text(),exit:text(),scale:text(),when:z.array(condSchema).max(12).optional()});
const statblockSchema=z.object({id:text(80),name:text(160),cr:text(8),base:text(160),body:text(12000)});
const briefSchema=z.object({sessionId:text(120),level:z.number().int().min(1).max(20).optional(),pressure:text(),endOn:text(600),npcs:text(1000),checklist:z.array(text(600)).max(12),encounters:z.array(text(120)).max(12),rules:z.array(text(120)).max(12)});
const routeSchema=z.object({when:z.array(condSchema).max(12).optional(),text:text(1200)});
const endingSchema=z.object({id:text(80),title:text(160),tone:text(200),summary:text(1200),reached:z.array(condSchema).max(12).optional(),requires:z.array(z.object({label:text(300),when:z.array(condSchema).max(12),routes:z.array(routeSchema).max(12).optional()})).max(16)});
const logSchema=z.object({id:text(80),at:text(40),sessionId:text(120),title:text(300),playId:text(120).optional(),changes:z.array(z.object({flag:text(80),from:value,to:value})).max(24),undone:z.boolean().optional()});
// The player site: prepared player-safe wiki entries (each with a suggested session to send it after) and the site's fixed pages.
export const wikiKinds=['Place','Person','Group','Thing','Event','Lore'] as const;
export const playerEntrySchema=z.object({id:text(120),title:text(200),kind:z.enum(wikiKinds),body:text(6000),revealAt:text(120).nullable().optional(),when:z.array(condSchema).max(12).optional()});
const siteSchema=z.object({title:text(200),css:text(30000),pages:z.array(z.object({id:z.string().regex(/^[a-z0-9-]{1,60}$/),title:text(200),summary:text(600),body:text(200000)})).max(12),images:z.array(z.object({name:z.string().regex(/^[a-z0-9-]{1,60}$/),dataUrl:z.string().regex(/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/).max(3000000)})).max(4).optional(),glossary:z.array(z.object({term:text(80),match:z.array(text(80)).min(1).max(6),text:text(400),entry:text(120).optional()})).max(120).optional()});
export const playbookSchema=z.object({id:text(120),title:text(200),version:text(40),flags:z.array(flagSchema).max(200),state:z.record(z.string(),value),log:z.array(logSchema).max(500),anytime:z.array(playSchema).max(300),encounters:z.array(encounterSchema).max(200),statblocks:z.array(statblockSchema).max(80),briefs:z.array(briefSchema).max(80),endings:z.array(endingSchema).max(12),references:z.array(z.object({title:text(160),body:text(12000)})).max(20).optional(),checks:z.record(z.string(),z.array(z.number().int())).optional(),playerWiki:z.array(playerEntrySchema).max(400).optional(),site:siteSchema.optional()});
export const rosterSchema=z.array(z.object({id:text(80),name:text(120),player:text(120),level:z.number().int().min(1).max(20),notes:text(600)})).max(12);
export const ledgerKinds=['Toll','Tithe','Trade','Gift','Mere','Eel','Stairs','Other'] as const;
export const ledgerSchema=z.array(z.object({id:text(80),character:text(120),kind:z.enum(ledgerKinds),weight:text(40),what:text(600),bell:text(40),sessionId:text(120),date:text(40)})).max(1000);
export const bargainSchema=z.array(z.object({id:text(80),with:text(160),terms:text(1200),status:z.enum(['Open','Kept','Broken']),sessionId:text(120),date:text(40)})).max(300);
export type Cond=z.infer<typeof condSchema>;export type Effect=z.infer<typeof effectSchema>;export type Flag=z.infer<typeof flagSchema>;
export type Encounter=z.infer<typeof encounterSchema>;export type StatBlock=z.infer<typeof statblockSchema>;export type Brief=z.infer<typeof briefSchema>;export type Ending=z.infer<typeof endingSchema>;
export type Playbook=z.infer<typeof playbookSchema>;export type LogEntry=Playbook['log'][number];export type PlayFields=Partial<{origin:'playbook'|'ai'|'dm';scene:string;tells:string;rules:string;later:string;keywords:string;when:Cond[];effects:Effect[]}>;
export type PlayerEntry=z.infer<typeof playerEntrySchema>;export type Site=z.infer<typeof siteSchema>;
export type RosterMember=z.infer<typeof rosterSchema>[number];export type LedgerEntry=z.infer<typeof ledgerSchema>[number];export type Bargain=z.infer<typeof bargainSchema>[number];
