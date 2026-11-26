import { z } from 'zod';
import MarkdownIt from 'markdown-it';
import { MAP_IMAGE_MAX, PIN_LIMIT, mapImage } from './maps';
// A map (lib/maps playerMap) adds its image and the pins the DM chose to show.
export const displaySchema = z
  .object({
    title: z.string().max(200),
    body: z.string().max(30000),
    image: z.string().max(MAP_IMAGE_MAX).regex(mapImage).optional(),
    pins: z
      .array(
        z
          .object({
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
            label: z.string().max(120),
          })
          .strict(),
      )
      .max(PIN_LIMIT)
      .optional(),
  })
  .strict();
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
// Players see formatted words only: raw HTML stays escaped, links show as plain text, and images show their alt text.
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });
markdown.renderer.rules.link_open = () => '';
markdown.renderer.rules.link_close = () => '';
markdown.renderer.rules.image = (tokens, index) => escape(tokens[index].content);
const mapFigure = (image: string, pins: { x: number; y: number; label: string }[]) =>
  `<figure><div><img src="${image}" alt="">${pins
    .map(
      (p) =>
        `<span style="left:${(p.x * 100).toFixed(3)}%;top:${(p.y * 100).toFixed(3)}%">${p.label ? '<em>' + escape(p.label) + '</em>' : ''}<b></b></span>`,
    )
    .join('')}</div></figure>`;
export function playerDocument(value: unknown) {
  const data = displaySchema.parse(value);
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>Waypoint · Player display</title><style>body{margin:0;background:#152b25;color:#edf1e4;font:20px/1.8 Georgia,serif}main{max-width:900px;margin:auto;padding:70px 55px}small{font:12px system-ui;letter-spacing:3px;color:#bacb9c}h1{font-weight:normal;font-size:46px;line-height:1.2}article{overflow-wrap:anywhere}article p{margin:0 0 .9em}article h2,article h3{font-weight:normal;color:#f4e7c1;margin:1.2em 0 .4em}article blockquote{margin:0 0 .9em;padding-left:20px;border-left:3px solid #6f8f6a;color:#dbe5c9;font-style:italic}article ul,article ol{margin:0 0 .9em;padding-left:1.4em}article strong{color:#ffffff}article table{border-collapse:collapse;margin:0 0 1em;font-size:.9em}article th,article td{border:1px solid #3f5d52;padding:6px 14px;text-align:left}article th{background:#1d3a32;color:#f4e7c1;font-weight:normal}footer{margin-top:70px;color:#a6b795;font:12px system-ui}main.wide{max-width:1500px;padding:40px 40px}figure{margin:24px 0 0}figure div{position:relative}figure img{display:block;width:100%;height:auto;border-radius:6px}figure span{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none}figure b{width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f4e7c1;border:2px solid #152b25;margin-bottom:6px}figure em{font:600 14px system-ui;font-style:normal;color:#152b25;background:#f4e7c1;padding:2px 8px;border-radius:4px;margin-bottom:4px;white-space:nowrap}</style></head><body><main${data.image ? ' class="wide"' : ''}><small>WAYPOINT · YOUR SHARED STORY</small><h1>${escape(data.title)}</h1>${data.image ? mapFigure(data.image, data.pins || []) : ''}<article>${markdown.render(data.body)}</article><footer>Presented by your dungeon master</footer></main></body></html>`;
}
