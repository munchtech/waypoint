import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import BookText from '../components/book-text-render';
import {safeWebLink} from '../lib/safe-web-link';
const source=`# Route

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
const html=renderToStaticMarkup(<BookText text={source}/>);
assert.match(html,/<ol start="7"><li>Parent<ul><li><p>Child<\/p><ol><li>Grandchild/);
assert.match(html,/<blockquote>[\s\S]*<blockquote>/);
assert.match(html,/<strong>Bold with <em>emphasis<\/em> and <a/);
assert.match(html,/href="https:\/\/example.com\/guide"/);
assert.match(html,/path_\(one\)/);
assert.match(html,/text-align:right/);
assert.match(html,/escaped \| pipe/);
assert.match(html,/&lt;script&gt;/);
assert.doesNotMatch(html,/<script|<img|href="(?:javascript:|file:|data:|shell:)/i);
assert.match(html,/<pre><code>&lt;img/);
for(const value of ['javascript:alert(1)','file:///C:/x','data:text/html,x','shell:AppsFolder','//example.com','https://user:pass@example.com','https://example.com\n/x'])assert.equal(safeWebLink(value),null,value);
assert.equal(safeWebLink('https://example.com/a?q=1'),'https://example.com/a?q=1');
assert.equal(safeWebLink('http://localhost:3000/'),'http://localhost:3000/');
const duplicate=renderToStaticMarkup(<BookText text={'# Route\n\n# Route\n\n[second](#route-1)'}/>);
assert.match(duplicate,/id="[^"]+-route-1"/);
console.log('Markdown passed: nested mixed lists, multi-paragraph items, nested quotes/emphasis, reference and balanced links, tables, unique heading anchors, escaped HTML, no image requests, unsafe URL rejection.');


