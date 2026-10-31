import {z} from 'zod';
export const recordingId=z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
export const recordingSchema=z.object({id:recordingId,campaignId:z.string(),sessionId:z.string(),title:z.string(),created:z.string(),file:z.string(),bytes:z.number().int().nonnegative(),chunks:z.number().int().nonnegative(),state:z.enum(['recording','interrupted','complete','imported']),markers:z.array(z.object({seconds:z.number().finite().nonnegative(),label:z.string()})),transcript:z.string().optional(),error:z.string().optional()}).refine(r=>['.webm','.wav','.mp3','.m4a','.ogg','.flac'].some(ext=>r.file===r.id+ext),'Invalid recording filename');
export type RecordingMetadata=z.infer<typeof recordingSchema>;
