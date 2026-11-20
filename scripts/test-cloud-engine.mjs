// Checks for the Claude engine that need no network and no key: settings and key validation, the request that would be sent,
// reading a reply, and the message shown for each kind of failure.
//   node scripts/test-cloud-engine.mjs            (after node scripts/build-desktop.mjs)
//   node scripts/test-cloud-engine.mjs --live     one real request; needs ANTHROPIC_API_KEY in the environment and costs a few cents
import assert from 'node:assert/strict';
import {
  DEFAULT_MODEL,
  MODELS,
  buildRequest,
  explain,
  generateCloud,
  parseAnswer,
  parseMaterial,
  readMessage,
  testKey,
  validKey,
  validSettings,
} from '../.sites-runtime/desktop-tests/cloud-engine.mjs';

// Settings accept only the listed models.
assert.equal(DEFAULT_MODEL, 'claude-opus-5-5');
assert.deepEqual(
  MODELS.map((m) => m.id),
  ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
);
assert.deepEqual(validSettings({ model: 'claude-sonnet-5-5' }), { model: 'claude-sonnet-5-5' });
for (const bad of [null, {}, { model: 'gpt-4.1-mini' }, { model: 'claude-opus-5-5-20260101' }])
  assert.throws(() => validSettings(bad));

// Key checks catch pasting mistakes; the fixture keys below are made up.
assert.equal(
  validKey('  sk-ant-api03-fixture-key-000000000000  '),
  'sk-ant-api03-fixture-key-000000000000',
);
for (const bad of [undefined, '', 'short', 'sk-ant-api03 with a space 0000000000', 'x'.repeat(401)])
  assert.throws(() => validKey(bad));
assert.throws(() => validKey('sk-proj-fixture-key-from-another-provider'), /another provider/);
assert.throws(() => validKey('sk-ant-admin-fixture-key-0000000000000'), /Admin key/);

// The request: instructions in a cached system block, the campaign in the user turn, a JSON schema for the reply.
const request = {
  mode: 'improvise',
  kind: 'NPC',
  prompt: 'A nervous apothecary',
  context: { campaign: { name: 'The Hollow Crown' } },
};
const { data, params } = buildRequest('claude-opus-5-5', request);
assert.equal(data.mode, 'improvise');
assert.equal(params.model, 'claude-opus-5-5');
assert.deepEqual(params.thinking, { type: 'adaptive' });
assert.equal(params.output_config.effort, 'medium');
assert.equal(params.output_config.format.type, 'json_schema');
assert.deepEqual(params.output_config.format.schema.required, ['cards']);
assert.equal(params.system.length, 1);
assert.deepEqual(params.system[0].cache_control, { type: 'ephemeral' });
assert.ok(params.system[0].text.length > 500);
assert.equal(params.messages.length, 1);
assert.equal(params.messages[0].role, 'user');
assert.ok(
  params.messages[0].content.includes('The Hollow Crown') &&
    params.messages[0].content.includes('A nervous apothecary'),
);
// Nothing about the key, and no sampling parameters the current models reject.
for (const forbidden of ['apiKey', 'temperature', 'top_p', 'top_k'])
  assert.equal(forbidden in params, false);
const full = buildRequest('claude-haiku-5-5', { ...request, mode: 'prepare' }).params;
assert.ok(full.output_config.format.schema.required.includes('branches'));
// The cached instructions are identical across requests of the same mode, whatever the campaign says.
assert.equal(
  buildRequest('claude-opus-5-5', { ...request, prompt: 'Something else entirely' }).params
    .system[0].text,
  params.system[0].text,
);
assert.throws(() => buildRequest('claude-opus-5-5', { mode: 'unknown', prompt: '', context: {} }));

// Reading a reply: text blocks only, and a refusal or a cut-off reply is an error before any content is used.
const sample = {
  title: '',
  summary: '',
  plan: '',
  arc: '',
  branches: [],
  events: [],
  cards: [
    {
      kind: 'NPC',
      title: 'Mara',
      body: 'An apothecary.',
      readAloud: 'Hello.',
      consequence: 'An ally.',
    },
  ],
};
const reply = {
  stop_reason: 'end_turn',
  content: [
    { type: 'thinking', thinking: '' },
    { type: 'text', text: JSON.stringify({ cards: sample.cards }) },
  ],
};
assert.equal(parseMaterial(readMessage(reply), 'improvise').cards[0].title, 'Mara');
assert.throws(
  () => readMessage({ stop_reason: 'refusal', stop_details: { category: 'bio' }, content: [] }),
  /declined this request \(bio\)/,
);
assert.throws(
  () => readMessage({ stop_reason: 'refusal', content: [{ type: 'text', text: 'partial' }] }),
  /declined/,
);
assert.throws(
  () => readMessage({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"cards":[' }] }),
  /cut off/,
);
assert.throws(
  () => readMessage({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }] }),
  /no text/,
);

// Parsing keeps only what a mode may fill.
assert.throws(() => parseMaterial('not json', 'prepare'));
assert.equal(
  parseMaterial('```json\n' + JSON.stringify(sample) + '\n```', 'improvise').cards[0].title,
  'Mara',
);
assert.deepEqual(
  parseMaterial(
    JSON.stringify({ cards: sample.cards, events: [{ text: 'Invented event' }] }),
    'improvise',
  ).events,
  [],
);
assert.throws(
  () => parseMaterial(JSON.stringify({ ...sample, cards: [] }), 'improvise'),
  /no material/,
);
assert.throws(() => parseMaterial(JSON.stringify(sample), 'prepare'), /no session paths/);

// Failures become one plain sentence. A wrong key is reported by Anthropic's own client without a network round trip being needed here.
assert.equal(explain(new Error('Already plain.')), 'Already plain.');
assert.match(explain('something odd'), /could not finish/);
const aborted = new AbortController();
aborted.abort();
await assert.rejects(
  generateCloud(
    { model: 'claude-haiku-5-5' },
    'sk-ant-api03-fixture-key-000000000000',
    request,
    aborted.signal,
  ),
  /stopped|not changed/i,
);

// Ask the campaign: a shorter request with its own format, and an answer that names only pages that were sent.
{
  const wiki = [
    { id: 'p1', title: 'Captain Voss' },
    { id: 'p2', title: 'The Drowned Bell' },
  ];
  const { params } = buildRequest(DEFAULT_MODEL, {
    mode: 'ask',
    prompt: 'Who is Voss?',
    context: { wiki },
  });
  assert.deepEqual(Object.keys(params.output_config.format.schema.properties), ['answer', 'pages']);
  assert.equal(params.output_config.effort, 'low');
  assert.equal(params.max_tokens, 16000);
  assert.match(params.system[0].text, /answering a dungeon master's question/);
  const answer = parseAnswer(
    JSON.stringify({
      answer: ' Voss is the harbour captain. ',
      pages: ['captain voss', 'Captain Voss', 'Invented Page'],
    }),
    wiki,
  );
  assert.deepEqual(answer, {
    answer: 'Voss is the harbour captain.',
    pages: [{ id: 'p1', title: 'Captain Voss' }],
  });
  for (const bad of ['not json', '{"answer":"","pages":[]}', '{"answer":"x"}'])
    assert.throws(() => parseAnswer(bad, wiki), /readable answer/);
}

// One path at a time: the format asks only for branches, and only the first returned branch is kept.
{
  const { params } = buildRequest(DEFAULT_MODEL, {
    mode: 'path',
    prompt: 'Notes',
    context: { existingPaths: ['Pursue the hook'] },
  });
  assert.deepEqual(Object.keys(params.output_config.format.schema.properties), ['branches']);
  assert.equal(params.output_config.effort, 'medium');
  const branch = {
    title: 'Steal the boat',
    style: 'Mischief',
    likelihood: 'Contingency',
    why: 'w',
    readAloud: 'r',
    response: 'x',
    consequence: 'c',
    fallback: 'f',
  };
  const one = parseMaterial(
    JSON.stringify({
      branches: [branch, { ...branch, title: 'Second' }],
      events: [{ text: 'x', style: 'Combat', enjoyment: 'Neutral' }],
    }),
    'path',
  );
  assert.deepEqual(
    one.branches.map((b) => b.title),
    ['Steal the boat'],
  );
  assert.equal(one.events.length, 0);
  assert.throws(() => parseMaterial('{"branches":[]}', 'path'), /no session paths/);
}

console.log(
  'Passed: model and key validation, request shape, cached instructions, reply reading, refusal and cut-off handling, output parsing, ask answers, single paths, stopped generation.',
);

if (process.argv.includes('--live')) {
  const key = process.env.ANTHROPIC_API_KEY;
  assert.ok(key, 'Set ANTHROPIC_API_KEY in the environment to run the live check.');
  for (const model of process.argv.includes('--all-models')
    ? MODELS.map((m) => m.id)
    : [DEFAULT_MODEL]) {
    console.log((await testKey({ model }, key)).message);
    const result = await generateCloud(
      { model },
      key,
      {
        mode: 'improvise',
        kind: 'NPC',
        prompt:
          'Create a brief apothecary NPC who has one useful clue about the missing courier. Keep the card under 150 words.',
        context: {
          campaign: {
            name: 'The Hollow Crown',
            tone: 'Mysterious',
            party: 'Four level 3 adventurers',
            boundaries: 'No harm to children',
          },
          confirmedEvents: ['Captain Voss agreed to help the party search for the courier.'],
        },
      },
      AbortSignal.timeout(240000),
    );
    assert.ok(result.cards.length);
    console.log(
      'Passed: live generation on ' +
        model +
        ' returned a valid NPC card: ' +
        result.cards[0].title,
    );
  }
}
