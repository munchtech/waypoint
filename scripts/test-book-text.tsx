import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import BookText from '../components/book-text-render';
import { safeWebLink } from '../lib/safe-web-link';
import { CampaignLinks } from '../components/campaign-links';
import { mentionIndex, splitMentions } from '../lib/wiki-mentions';
import { relevance } from '../lib/campaign-search';
import type { WikiPage } from '../lib/memory';
const source = `# Route

[Jump](#route) and [reference][guide]. **Bold with *emphasis* and [web](https://example.com/path_(one))**.

7. Parent
   - Child
     1. Grandchild

     A second paragraph in the child.
8. Sibling

> Outer
>
> > Inner with **bold**

| Name | Note |
| :--- | ---: |
| Bell | escaped \\| pipe |

[guide]: https://example.com/guide "Guide"

<script>alert(1)</script>

![Image](https://example.com/image.png)

[bad](javascript:alert%281%29) [file](file:///C:/secret) [app](shell:AppsFolder) [data](data:text/html,test)

~~~html
<img src=x onerror=alert(1)>
~~~`;
const html = renderToStaticMarkup(<BookText text={source} />);
assert.match(html, /<ol start="7"><li>Parent<ul><li><p>Child<\/p><ol><li>Grandchild/);
assert.match(html, /<blockquote>[\s\S]*<blockquote>/);
assert.match(html, /<strong>Bold with <em>emphasis<\/em> and <a/);
assert.match(html, /href="https:\/\/example.com\/guide"/);
assert.match(html, /path_\(one\)/);
assert.match(html, /text-align:right/);
assert.match(html, /escaped \| pipe/);
assert.match(html, /&lt;script&gt;/);
assert.doesNotMatch(html, /<script|<img|href="(?:javascript:|file:|data:|shell:)/i);
assert.match(html, /<pre><code>&lt;img/);
for (const value of [
  'javascript:alert(1)',
  'file:///C:/x',
  'data:text/html,x',
  'shell:AppsFolder',
  '//example.com',
  'https://user:pass@example.com',
  'https://example.com\n/x',
])
  assert.equal(safeWebLink(value), null, value);
assert.equal(safeWebLink('https://example.com/a?q=1'), 'https://example.com/a?q=1');
assert.equal(safeWebLink('http://localhost:3000/'), 'http://localhost:3000/');
const duplicate = renderToStaticMarkup(
  <BookText text={'# Route\n\n# Route\n\n[second](#route-1)'} />,
);
assert.match(duplicate, /id="[^"]+-route-1"/);
console.log(
  'Markdown passed: nested mixed lists, multi-paragraph items, nested quotes/emphasis, reference and balanced links, tables, unique heading anchors, escaped HTML, no image requests, unsafe URL rejection.',
);
const page: WikiPage = {
  id: 'observatory',
  title: 'Silver Observatory',
  aliases: 'Moonwatch',
  kind: 'Location',
  body: 'A moon lens.',
  status: 'Confirmed',
  visibility: 'DM only',
  sourceId: '',
  quote: '',
  updated: '2026-11-09',
  history: [],
};
const mentions = splitMentions(
  'The Silver Observatory overlooks Moonwatch. Moonwatchers see it.',
  mentionIndex([page]),
  new Set(),
);
assert.equal(
  mentions.filter((part) => part.pageId).length,
  1,
  'Each page should be linked once per document',
);
assert.equal(
  mentions.map((part) => part.text).join(''),
  'The Silver Observatory overlooks Moonwatch. Moonwatchers see it.',
);
assert(!splitMentions('Moonwatchers', mentionIndex([page]), new Set()).some((part) => part.pageId));
assert(
  !splitMentions(
    'Moonwatch',
    mentionIndex([page, { ...page, id: 'other', title: 'Another place' }]),
    new Set(),
  ).some((part) => part.pageId),
  'Ambiguous aliases must remain plain text',
);
assert(
  !splitMentions('Silver Observatory', mentionIndex([page], page.id), new Set()).some(
    (part) => part.pageId,
  ),
  'A page should not link to itself',
);
assert(
  !splitMentions(
    'Keep these changes for 2024.',
    mentionIndex([{ ...page, aliases: 'keep, changes, 2024' }]),
    new Set(),
  ).some((part) => part.pageId),
  'Generic words and years must not become alias links',
);
const linked = renderToStaticMarkup(
  <CampaignLinks.Provider value={{ pages: [page], onOpen: () => {} }}>
    <BookText
      text={
        '# Silver Observatory\n\nVisit Silver Observatory, then Moonwatch. [Moonwatch](https://example.com). `Moonwatch`'
      }
    />
  </CampaignLinks.Provider>,
);
assert.equal((linked.match(/class="wiki-mention"/g) || []).length, 1);
assert(
  !/<a[^>]*>[\s\S]*?<button/.test(linked),
  'Existing links must not contain nested reference buttons',
);
const every = splitMentions(
  'The Silver Observatory overlooks Moonwatch. Moonwatchers see it.',
  mentionIndex([page]),
  new Set(),
  true,
);
assert.equal(every.filter((part) => part.pageId).length, 2, 'Table text should link every mention');
assert.equal(
  every.map((part) => part.text).join(''),
  'The Silver Observatory overlooks Moonwatch. Moonwatchers see it.',
);
const girl: WikiPage = { ...page, id: 'ila', title: 'Ila Harrow', aliases: 'Ila' };
const short = splitMentions(
  'Ila waves; ila and ILA do not, nor Ilan or Tila. Ila again.',
  mentionIndex([girl]),
  new Set(),
  true,
);
assert.deepEqual(
  short.filter((part) => part.pageId).map((part) => part.text),
  ['Ila', 'Ila'],
  'Three-letter names link only when written exactly',
);
assert(
  !splitMentions(
    'Tam left.',
    mentionIndex([{ ...page, id: 'tam', aliases: 'tam' }]),
    new Set(),
  ).some((part) => part.pageId),
  'A lower-case three-letter alias never links',
);
const everyRendered = renderToStaticMarkup(
  <CampaignLinks.Provider value={{ pages: [page], onOpen: () => {} }}>
    <BookText
      linkEvery
      text={'Visit Silver Observatory, then Moonwatch. [Moonwatch](https://example.com)'}
    />
  </CampaignLinks.Provider>,
);
assert.equal((everyRendered.match(/class="wiki-mention"/g) || []).length, 2);
const goText = 'Record it in the [Bargain log](go:bargains), then [nowhere](go:attic).';
const going = renderToStaticMarkup(
  <CampaignLinks.Provider value={{ pages: [], onOpen: () => {}, onGo: () => {} }}>
    <BookText text={goText} />
  </CampaignLinks.Provider>,
);
assert.equal(
  (going.match(/class="go-link"/g) || []).length,
  1,
  'Only known places become go links',
);
assert.match(going, /title="Open Bargain log">Bargain log<\/button>/);
assert.match(going, /then nowhere\./);
const notGoing = renderToStaticMarkup(<BookText text={goText} />);
assert.doesNotMatch(
  notGoing,
  /<button|<a |Unsupported/,
  'Without a handler, go links read as plain text',
);
console.log(
  'Table links passed: every mention, exact three-letter names, go links to known places only.',
);
assert(
  relevance('Silver Observatory', 'silvr observatry') > 0,
  'A small typing error should still find a campaign page',
);
assert.equal(relevance('Harbor captain', 'zzzzzzzz'), 0);
console.log(
  'Context links passed: original text, word boundaries, repeated mentions, ambiguous aliases, self links, existing links and code. Search typo matching passed.',
);
