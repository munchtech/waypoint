import { jumped } from './scroll-place';

// The session guide's headings on the desk (### renders as h5, ## as h4). The folded short plan repeats some of their words,
// so only the guide itself is searched.
export function guideHeadings() {
  return [...document.querySelectorAll<HTMLElement>('.plan-guide :is(h4, h5)')];
}
// Scrolls to a guide heading once the notes have rendered it: a jump from another screen has to wait for the page.
export function jumpToHeading(title: string, tries = 60) {
  const heading = guideHeadings().find((h) => h.textContent?.trim() === title);
  if (heading) {
    jumped();
    heading.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else if (tries > 0) setTimeout(() => jumpToHeading(title, tries - 1), 50);
}
