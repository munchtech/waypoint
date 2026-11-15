// Claude generation for the desktop app, through the official Anthropic SDK.
// The API key is passed in by the caller: desktop/main.ts keeps it encrypted on disk, and nothing here reads the disk or the environment.
import Anthropic from '@anthropic-ai/sdk';
import {input, instructionsFor, packet, schema} from '../lib/generation-contract';

export const MODELS = [
  {id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'The most capable of the three. The default.'},
  {id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Faster, at about half the cost of Opus.'},
  {id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'The fastest and by far the cheapest, with plainer writing.'},
] as const;
export type ModelId = (typeof MODELS)[number]['id'];
export type Settings = {model: ModelId};
export const DEFAULT_MODEL: ModelId = 'claude-opus-5-5';

// A request one of these models declines is re-run on Anthropic's recommended fallback model inside the same call.
// Claude Haiku 5.5 has no server-side fallback, so it is called without the parameter.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const withFallback = new Set<ModelId>(['claude-opus-5-5', 'claude-sonnet-5-5']);

export function validSettings(value: unknown): Settings {
  const model = (value as {model?: unknown} | null)?.model;
  const known = MODELS.find(m => m.id === model);
  if (!known) throw new Error('Choose one of the listed Claude models.');
  return {model: known.id};
}

// Catches the mistakes people actually make when pasting a key; Anthropic decides whether the key is good.
export function validKey(value: unknown): string {
  const key = typeof value === 'string' ? value.trim() : '';
  if (key.length < 20 || key.length > 400 || /\s/.test(key)) throw new Error('That does not look like an API key. Paste the whole key, with no spaces.');
  if (key.startsWith('sk-ant-admin')) throw new Error('That is an Admin key. Create a regular API key in the Anthropic Console instead.');
  if (key.startsWith('sk-') && !key.startsWith('sk-ant-')) throw new Error('That looks like a key from another provider. Waypoint needs an Anthropic API key, which starts with sk-ant-.');
  return key;
}

export function parseMaterial(raw: string, mode: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value;
  try {
    value = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('The model did not return valid JSON. Nothing was saved. Try again, or shorten the session notes.');
    value = JSON.parse(cleaned.slice(start, end + 1));
  }
  // Only the fields a mode is allowed to fill are kept, so a stray event or branch can never reach the campaign.
  if (mode === 'improvise' && value && typeof value === 'object') value = {title: '', summary: '', plan: '', arc: '', branches: [], cards: value.cards, events: []};
  if (mode === 'memory' && value && typeof value === 'object') value = {title: '', summary: value.summary, plan: '', arc: '', branches: [], cards: value.cards, events: []};
  const parsed = packet.safeParse(value);
  if (!parsed.success) throw new Error('The model response was incomplete or did not match the required format. Nothing was saved. Try again, or shorten the session notes.');
  if (mode === 'improvise' && !parsed.data.cards.length) throw new Error('The model returned no material. Try again with a more specific prompt.');
  if (!['improvise', 'recap', 'memory'].includes(mode) && !parsed.data.branches.length) throw new Error('The model returned no session paths. Try again.');
  return parsed.data;
}

// The whole request for one generation. The instructions are the stable part, so they carry the cache marker;
// the campaign context changes every time and goes in the user turn.
export function buildRequest(model: ModelId, request: unknown) {
  const data = input.parse(request);
  const format = data.mode === 'improvise'
    ? {type: 'object', properties: {cards: schema.properties.cards}, required: ['cards'], additionalProperties: false}
    : schema;
  return {
    data,
    params: {
      model,
      max_tokens: 64000,
      thinking: {type: 'adaptive' as const},
      system: [{type: 'text' as const, text: instructionsFor(data.mode, data.kind), cache_control: {type: 'ephemeral' as const}}],
      messages: [{role: 'user' as const, content: 'TASK AND CAMPAIGN CONTEXT:\n' + JSON.stringify(data)}],
      output_config: {effort: 'medium' as const, format: {type: 'json_schema' as const, schema: format}},
    },
  };
}

type Reply = {stop_reason: string | null; stop_details?: {category?: string | null} | null; content: {type: string; text?: string}[]};
// The JSON text of a finished reply. A refusal or a cut-off reply is an error, checked before the content is read.
export function readMessage(message: Reply) {
  if (message.stop_reason === 'refusal') {
    const category = message.stop_details?.category;
    throw new Error('Claude declined this request' + (category ? ' (' + category + ')' : '') + '. Nothing was changed. Rephrase the prompt and try again.');
  }
  if (message.stop_reason === 'max_tokens' || message.stop_reason === 'model_context_window_exceeded') throw new Error('The response was cut off before it finished. Nothing was changed. Shorten the session notes and try again.');
  const text = message.content.filter(block => block.type === 'text').map(block => block.text || '').join('');
  if (!text) throw new Error('Claude returned no text. Nothing was changed. Try again.');
  return text;
}

// Anthropic's own explanation from an error response, when it sent one.
function apiDetail(error: InstanceType<typeof Anthropic.APIError>) {
  const body = error.error as {error?: {message?: unknown}} | undefined;
  const message = body?.error?.message;
  return typeof message === 'string' && message ? message.slice(0, 300) : '';
}

// One plain sentence per failure the DM can act on. Most specific classes first.
export function explain(error: unknown): string {
  if (error instanceof Anthropic.APIUserAbortError) return 'Generation stopped. Your campaign was not changed.';
  if (error instanceof Anthropic.APIConnectionTimeoutError) return 'Anthropic took too long to answer. Nothing was changed. Try again.';
  if (error instanceof Anthropic.APIConnectionError) return 'Could not reach Anthropic. Check your internet connection and try again.';
  if (error instanceof Anthropic.AuthenticationError) return 'Anthropic rejected the API key. Check it in AI & backups.';
  if (error instanceof Anthropic.PermissionDeniedError) return 'This API key is not allowed to use the selected model. Choose another model in AI & backups.';
  if (error instanceof Anthropic.NotFoundError) return 'The selected model was not found for this key. Choose another model in AI & backups.';
  if (error instanceof Anthropic.ContentTooLargeError) return 'This campaign context is too large for one request. Shorten the session notes and try again.';
  if (error instanceof Anthropic.RateLimitError) return 'Anthropic is rate limiting this key. Wait a moment and try again.';
  if (error instanceof Anthropic.BadRequestError) return 'Anthropic could not accept this request' + (apiDetail(error) ? ': ' + apiDetail(error) : '.') + ' Nothing was changed.';
  if (error instanceof Anthropic.OverloadedError || error instanceof Anthropic.InternalServerError) return 'Anthropic is temporarily unavailable. Nothing was changed. Try again in a moment.';
  if (error instanceof Anthropic.APIError) return 'Anthropic returned an error' + (error.status ? ' (' + error.status + ')' : '') + '. Nothing was changed. Try again.';
  return error instanceof Error ? error.message : 'Generation could not finish. Your campaign is safe.';
}

// Checks the key and the chosen model without generating anything, so the check costs nothing.
export async function testKey(settings: Settings, apiKey: string) {
  const client = new Anthropic({apiKey, maxRetries: 1});
  try {
    const model = await client.models.retrieve(settings.model);
    return {ok: true, message: 'Connected. ' + model.display_name + ' is available to this key.'};
  } catch (error) {
    throw new Error(explain(error));
  }
}

export async function generateCloud(settings: Settings, apiKey: string, request: unknown, signal: AbortSignal) {
  const {data, params} = buildRequest(settings.model, request);
  const client = new Anthropic({apiKey, maxRetries: 1});
  try {
    // Streamed so a long reply cannot hit an HTTP timeout; only the finished message is used.
    const message = withFallback.has(settings.model)
      ? await client.beta.messages.stream({...params, betas: [FALLBACK_BETA], fallbacks: 'default'}, {signal}).finalMessage()
      : await client.messages.stream(params, {signal}).finalMessage();
    return parseMaterial(readMessage(message), data.mode);
  } catch (error) {
    throw new Error(explain(error));
  }
}
