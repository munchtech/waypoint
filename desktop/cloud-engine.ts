// Claude generation for the desktop app, through the official Anthropic SDK.
// The API key is passed in by the caller: desktop/main.ts keeps it encrypted on disk, and nothing here reads the disk or the environment.
import Anthropic from '@anthropic-ai/sdk';
import {
  answerPacket,
  answerSchema,
  input,
  instructionsFor,
  packet,
  progressOf,
  schema,
} from '../lib/generation-contract';

export const MODELS = [
  {
    id: 'claude-opus-5-5',
    label: 'Claude Opus 5.5',
    note: 'The most capable of the three. The default.',
  },
  {
    id: 'claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5',
    note: 'Faster, at about half the cost of Opus.',
  },
  {
    id: 'claude-haiku-5-5',
    label: 'Claude Haiku 5.5',
    note: 'The fastest and by far the cheapest, with plainer writing.',
  },
] as const;
export type ModelId = (typeof MODELS)[number]['id'];
export type Settings = { model: ModelId };
export const DEFAULT_MODEL: ModelId = 'claude-opus-5-5';

// A request one of these models declines is re-run on Anthropic's recommended fallback model inside the same call.
// Claude Haiku 5.5 has no server-side fallback, so it is called without the parameter.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const withFallback = new Set<ModelId>(['claude-opus-5-5', 'claude-sonnet-5-5']);

export function validSettings(value: unknown): Settings {
  const model = (value as { model?: unknown } | null)?.model;
  const known = MODELS.find((m) => m.id === model);
  if (!known) throw new Error('Choose one of the listed Claude models.');
  return { model: known.id };
}

// Catches the mistakes people actually make when pasting a key; Anthropic decides whether the key is good.
export function validKey(value: unknown): string {
  const key = typeof value === 'string' ? value.trim() : '';
  if (key.length < 20 || key.length > 400 || /\s/.test(key))
    throw new Error('That does not look like an API key. Paste the whole key, with no spaces.');
  if (key.startsWith('sk-ant-admin'))
    throw new Error(
      'That is an Admin key. Create a regular API key in the Anthropic Console instead.',
    );
  if (key.startsWith('sk-') && !key.startsWith('sk-ant-'))
    throw new Error(
      'That looks like a key from another provider. Waypoint needs an Anthropic API key, which starts with sk-ant-.',
    );
  return key;
}

export function parseMaterial(raw: string, mode: string) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  let value;
  try {
    value = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{'),
      end = cleaned.lastIndexOf('}');
    if (start < 0 || end < start)
      throw new Error(
        'The model did not return valid JSON. Nothing was saved. Try again, or shorten the session notes.',
      );
    value = JSON.parse(cleaned.slice(start, end + 1));
  }
  // Only the fields a mode is allowed to fill are kept, so a stray event or branch can never reach the campaign.
  if (mode === 'improvise' && value && typeof value === 'object')
    value = {
      title: '',
      summary: '',
      plan: '',
      arc: '',
      branches: [],
      cards: value.cards,
      events: [],
    };
  if (mode === 'path' && value && typeof value === 'object')
    value = {
      title: '',
      summary: '',
      plan: '',
      arc: '',
      branches: Array.isArray(value.branches) ? value.branches.slice(0, 1) : value.branches,
      cards: [],
      events: [],
    };
  if (mode === 'memory' && value && typeof value === 'object')
    value = {
      title: '',
      summary: value.summary,
      plan: '',
      arc: '',
      branches: [],
      cards: value.cards,
      events: [],
    };
  const parsed = packet.safeParse(value);
  if (!parsed.success)
    throw new Error(
      'The model response was incomplete or did not match the required format. Nothing was saved. Try again, or shorten the session notes.',
    );
  if (mode === 'improvise' && !parsed.data.cards.length)
    throw new Error('The model returned no material. Try again with a more specific prompt.');
  if (!['improvise', 'recap', 'memory'].includes(mode) && !parsed.data.branches.length)
    throw new Error('The model returned no session paths. Try again.');
  return parsed.data;
}

// An answer to Ask the campaign. Only titles of pages that were actually sent are kept, matched without case,
// so the DM can open each one; anything else the model named is dropped.
export function parseAnswer(raw: string, wiki: unknown) {
  let value;
  try {
    value = JSON.parse(raw.trim());
  } catch {
    throw new Error('Claude did not return a readable answer. Nothing was changed. Try again.');
  }
  const parsed = answerPacket.safeParse(value);
  if (!parsed.success || !parsed.data.answer.trim())
    throw new Error('Claude did not return a readable answer. Nothing was changed. Try again.');
  const sent = (Array.isArray(wiki) ? wiki : []).filter(
    (p): p is { id: string; title: string } =>
      !!p && typeof p.id === 'string' && typeof p.title === 'string',
  );
  const pages: { id: string; title: string }[] = [];
  for (const title of parsed.data.pages) {
    const page = sent.find((p) => p.title.trim().toLowerCase() === title.trim().toLowerCase());
    if (page && !pages.some((p) => p.id === page.id))
      pages.push({ id: page.id, title: page.title });
  }
  return { answer: parsed.data.answer.trim(), pages };
}

// Only the lists a mode fills are in its reply format, so a short request does not pay for empty fields.
function formatFor(mode: string) {
  const only = (key: 'cards' | 'branches') => ({
    type: 'object',
    properties: { [key]: schema.properties[key] },
    required: [key],
    additionalProperties: false,
  });
  return mode === 'improvise'
    ? only('cards')
    : mode === 'path'
      ? only('branches')
      : mode === 'ask'
        ? answerSchema
        : schema;
}

// The whole request for one generation. The instructions are the stable part, so they carry the cache marker;
// the campaign context changes every time and goes in the user turn.
export function buildRequest(model: ModelId, request: unknown) {
  const data = input.parse(request);
  const format = formatFor(data.mode);
  const short = data.mode === 'ask';
  return {
    data,
    params: {
      model,
      max_tokens: short ? 16000 : 64000,
      thinking: { type: 'adaptive' as const },
      system: [
        {
          type: 'text' as const,
          text: instructionsFor(data.mode, data.kind),
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages: [
        { role: 'user' as const, content: 'TASK AND CAMPAIGN CONTEXT:\n' + JSON.stringify(data) },
      ],
      output_config: {
        effort: short ? ('low' as const) : ('medium' as const),
        format: { type: 'json_schema' as const, schema: format },
      },
    },
  };
}

type Reply = {
  stop_reason: string | null;
  stop_details?: { category?: string | null } | null;
  content: { type: string; text?: string }[];
};
// The JSON text of a finished reply. A refusal or a cut-off reply is an error, checked before the content is read.
export function readMessage(message: Reply) {
  if (message.stop_reason === 'refusal') {
    const category = message.stop_details?.category;
    throw new Error(
      'Claude declined this request' +
        (category ? ' (' + category + ')' : '') +
        '. Nothing was changed. Rephrase the prompt and try again.',
    );
  }
  if (
    message.stop_reason === 'max_tokens' ||
    message.stop_reason === 'model_context_window_exceeded'
  )
    throw new Error(
      'The response was cut off before it finished. Nothing was changed. Shorten the session notes and try again.',
    );
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text || '')
    .join('');
  if (!text) throw new Error('Claude returned no text. Nothing was changed. Try again.');
  return text;
}

// Anthropic's own explanation from an error response, when it sent one.
function apiDetail(error: InstanceType<typeof Anthropic.APIError>) {
  const body = error.error as { error?: { message?: unknown } } | undefined;
  const message = body?.error?.message;
  return typeof message === 'string' && message ? message.slice(0, 300) : '';
}

// One plain sentence per failure the DM can act on. Most specific classes first.
export function explain(error: unknown): string {
  if (error instanceof Anthropic.APIUserAbortError)
    return 'Generation stopped. Your campaign was not changed.';
  if (error instanceof Anthropic.APIConnectionTimeoutError)
    return 'Anthropic took too long to answer. Nothing was changed. Try again.';
  if (error instanceof Anthropic.APIConnectionError)
    return 'Could not reach Anthropic. Check your internet connection and try again.';
  if (error instanceof Anthropic.AuthenticationError)
    return 'Anthropic rejected the API key. Check it in AI & backups.';
  if (error instanceof Anthropic.PermissionDeniedError)
    return 'This API key is not allowed to use the selected model. Choose another model in AI & backups.';
  if (error instanceof Anthropic.NotFoundError)
    return 'The selected model was not found for this key. Choose another model in AI & backups.';
  if (error instanceof Anthropic.ContentTooLargeError)
    return 'This campaign context is too large for one request. Shorten the session notes and try again.';
  if (error instanceof Anthropic.RateLimitError)
    return 'Anthropic is rate limiting this key. Wait a moment and try again.';
  if (error instanceof Anthropic.BadRequestError)
    return (
      'Anthropic could not accept this request' +
      (apiDetail(error) ? ': ' + apiDetail(error) : '.') +
      ' Nothing was changed.'
    );
  if (error instanceof Anthropic.OverloadedError || error instanceof Anthropic.InternalServerError)
    return 'Anthropic is temporarily unavailable. Nothing was changed. Try again in a moment.';
  if (error instanceof Anthropic.APIError)
    return (
      'Anthropic returned an error' +
      (error.status ? ' (' + error.status + ')' : '') +
      '. Nothing was changed. Try again.'
    );
  return error instanceof Error
    ? error.message
    : 'Generation could not finish. Your campaign is safe.';
}

// Checks the key and the chosen model without generating anything, so the check costs nothing.
export async function testKey(settings: Settings, apiKey: string) {
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  try {
    const model = await client.models.retrieve(settings.model);
    return { ok: true, message: 'Connected. ' + model.display_name + ' is available to this key.' };
  } catch (error) {
    throw new Error(explain(error));
  }
}

type Streaming = {
  on(event: 'text', listener: (delta: string, snapshot: string) => void): unknown;
};

export async function generateCloud(
  settings: Settings,
  apiKey: string,
  request: unknown,
  signal: AbortSignal,
  onProgress: (label: string) => void = () => {},
) {
  const { data, params } = buildRequest(settings.model, request);
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  // The banner changes only when the label does: when a new path or card title has arrived.
  let last = '';
  const report = (label: string) => {
    if (label !== last) onProgress((last = label));
  };
  const follow = <T extends Streaming>(stream: T) => {
    stream.on('text', (_delta, snapshot) => report(progressOf(snapshot, data.mode)));
    return stream;
  };
  report('Thinking it through…');
  try {
    // Streamed so a long reply cannot hit an HTTP timeout; the finished message is what gets used.
    const message = withFallback.has(settings.model)
      ? await follow(
          client.beta.messages.stream(
            { ...params, betas: [FALLBACK_BETA], fallbacks: 'default' },
            { signal },
          ),
        ).finalMessage()
      : await follow(client.messages.stream(params, { signal })).finalMessage();
    const text = readMessage(message);
    return data.mode === 'ask'
      ? parseAnswer(text, data.context.wiki)
      : parseMaterial(text, data.mode);
  } catch (error) {
    throw new Error(explain(error));
  }
}
