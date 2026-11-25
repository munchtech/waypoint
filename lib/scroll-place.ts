// Where you were on each desk tab, kept until the app closes, so looking something up and coming back finds the same scene.
const places = new Map<string, number>();
export const deskPlace = (campaignId: string, sessionId: string, tab: string) =>
  [campaignId, sessionId, tab].join('/');
export const keepPlace = (key: string, top: number) => {
  places.set(key, top);
};
export const placeOf = (key: string) => places.get(key);

let turn = 0;
// A jump, a click or the wheel means the DM is going somewhere else, so a place still being restored gives way.
export const cancelScroll = () => {
  turn++;
};
// A jump to a heading claims the scroll, so the change of screen that came with it doesn't pull the page back.
let jumpedAt = -Infinity;
export const jumped = () => {
  cancelScroll();
  jumpedAt = performance.now();
};
export const justJumped = () => performance.now() - jumpedAt < 300;
// Scrolls to a place, trying again while the page is still too short to hold it (notes and cards render a moment later).
// Until they have, the browser's own scroll anchoring would carry the page down with whatever sits below them.
let settled: ReturnType<typeof setTimeout> | undefined;
export function scrollToPlace(top: number, tries = 60) {
  const mine = ++turn,
    page = document.documentElement;
  for (const kind of ['wheel', 'pointerdown', 'keydown'] as const)
    window.addEventListener(kind, () => mine === turn && cancelScroll(), {
      once: true,
      passive: true,
    });
  page.style.overflowAnchor = 'none';
  clearTimeout(settled);
  settled = setTimeout(() => page.style.removeProperty('overflow-anchor'), 1500);
  const step = (left: number) => {
    if (mine !== turn) return;
    window.scrollTo({ top });
    if (left > 0 && Math.abs(window.scrollY - top) > 2) requestAnimationFrame(() => step(left - 1));
  };
  step(tries);
}
