'use client';
import { useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { CampaignLinks } from './campaign-links';
import { atQuery, linkOptions, sharedIndex } from '../lib/backlinks';

// Where the caret sits inside a textarea, measured on an invisible copy laid out the same way.
const copied = [
  'boxSizing',
  'width',
  'borderTopWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'tabSize',
  'textTransform',
  'wordSpacing',
] as const;
function caretAt(area: HTMLTextAreaElement, position: number) {
  const style = getComputedStyle(area),
    copy = document.createElement('div'),
    mark = document.createElement('span');
  for (const key of copied) copy.style[key] = style[key];
  Object.assign(copy.style, {
    position: 'absolute',
    visibility: 'hidden',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    top: '0',
    left: '-9999px',
  });
  copy.textContent = area.value.slice(0, position);
  mark.textContent = '​';
  copy.append(mark);
  document.body.append(copy);
  const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4,
    top = parseFloat(style.borderTopWidth) + mark.offsetTop - area.scrollTop,
    left = parseFloat(style.borderLeftWidth) + mark.offsetLeft - area.scrollLeft;
  copy.remove();
  return { top, left, line };
}

// A textarea where typing @ offers the campaign's pages and stat blocks by name. Picking one writes its name, which links
// to that page wherever the text is read; Ctrl Z takes it back like any typing. Without campaign links it is a plain textarea.
export default function MentionTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const links = useContext(CampaignLinks),
    area = useRef<HTMLTextAreaElement>(null),
    dismissed = useRef(-1),
    menuId = useId();
  const [open, setOpen] = useState<{ start: number; query: string } | null>(null),
    [active, setActive] = useState(0),
    [place, setPlace] = useState({ left: 0, top: 0, up: false }),
    [host, setHost] = useState<HTMLElement | null>(null);
  const index = useMemo(() => (links ? sharedIndex(links.pages, links.creatures) : null), [links]);
  const options = useMemo(
    () =>
      open && links && index ? linkOptions(open.query, links.pages, index, links.creatures) : [],
    [open, links, index],
  );
  const showing = open && options.length > 0;
  useEffect(() => {
    if (!showing) return;
    const close = (e: Event) => {
      if (!(e.target instanceof Node && document.getElementById(menuId)?.contains(e.target)))
        setOpen(null);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [showing, menuId]);
  function sync() {
    const el = area.current;
    if (!el || !links || el.selectionStart !== el.selectionEnd) return setOpen(null);
    const found = atQuery(el.value, el.selectionStart);
    if (found?.start !== dismissed.current) dismissed.current = -1;
    if (!found || dismissed.current >= 0) return setOpen(null);
    if (found.start !== open?.start || found.query !== open.query) setActive(0);
    const box = el.getBoundingClientRect(),
      caret = caretAt(el, found.start),
      below = box.top + caret.top + caret.line,
      up = below + 260 > window.innerHeight && box.top + caret.top > 280;
    setPlace({
      left: Math.max(8, Math.min(box.left + caret.left, window.innerWidth - 328)),
      top: up ? box.top + caret.top - 4 : below + 4,
      up,
    });
    // Inside a modal dialog the menu has to live in the dialog to show above it.
    setHost(el.closest('dialog') || document.body);
    setOpen(found);
  }
  function choose(i: number) {
    const el = area.current,
      option = options[i];
    if (!el || !open || !option) return;
    el.focus();
    el.setSelectionRange(open.start, el.selectionStart);
    if (!document.execCommand('insertText', false, option.name)) {
      const next = el.value.slice(0, open.start) + option.name + el.value.slice(el.selectionEnd);
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(el, next);
      el.setSelectionRange(open.start + option.name.length, open.start + option.name.length);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setOpen(null);
  }
  const menu = showing ? (
    <div
      className={'mention-menu' + (place.up ? ' up' : '')}
      id={menuId}
      role="listbox"
      aria-label="Link a page"
      style={{ left: place.left, top: place.top }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {options.map((option, i) => (
        <div
          key={option.id}
          id={menuId + '-' + i}
          role="option"
          aria-selected={i === active}
          className="mention-option"
          onMouseEnter={() => setActive(i)}
          onClick={() => choose(i)}
        >
          <span>{option.name}</span>
          <small>
            {option.kind}
            {option.hint && ' · ' + option.hint}
          </small>
        </div>
      ))}
      <p className="mention-help">Enter or Tab links · Esc keeps the @</p>
    </div>
  ) : null;
  return (
    <>
      <textarea
        {...props}
        ref={area}
        aria-autocomplete={links ? 'list' : undefined}
        aria-controls={showing ? menuId : undefined}
        aria-activedescendant={showing ? menuId + '-' + active : undefined}
        onChange={(e) => {
          props.onChange?.(e);
          sync();
        }}
        onKeyDown={(e) => {
          if (showing) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              const step = e.key === 'ArrowDown' ? 1 : -1;
              setActive((i) => (i + step + options.length) % options.length);
              return;
            }
            if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && !e.ctrlKey) {
              e.preventDefault();
              choose(active);
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              dismissed.current = open.start;
              setOpen(null);
              return;
            }
          }
          props.onKeyDown?.(e);
        }}
        onKeyUp={(e) => {
          if (
            ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) ||
            (!showing && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))
          )
            sync();
          props.onKeyUp?.(e);
        }}
        onClick={(e) => {
          sync();
          props.onClick?.(e);
        }}
        onBlur={(e) => {
          setOpen(null);
          props.onBlur?.(e);
        }}
      />
      {menu && host && createPortal(menu, host)}
    </>
  );
}
