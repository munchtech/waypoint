'use client';
import { useRef, useState } from 'react';
import { BookOpen, Check, Paperclip, Sparkles, Undo2, X } from 'lucide-react';
import MentionTextarea from './mention-textarea';
import MaterialBody from './material-body';
import { uid, type Campaign } from '../lib/campaign';
import type { Attachment } from '../lib/generation-contract';
import { memoryOf } from '../lib/memory';
import {
  applyProposal,
  attachmentLimits,
  attachmentType,
  canUndo,
  undoProposal,
  type AssistProposal,
  type AssistState,
} from '../lib/assistant';

const megabytes = (n: number) => Math.round((n / 1024 / 1024) * 10) / 10 + ' MB';
// A picked file as it is sent: text as it is, a PDF or an image as base64.
async function readAttachment(file: File): Promise<Attachment> {
  const type = attachmentType(file.name, file.type);
  if (!type)
    throw new Error('Attach a text or Markdown file, a PDF, or a PNG, JPEG, WebP or GIF image.');
  if (type === 'text/plain') {
    const text = await file.text();
    if (text.length > attachmentLimits.text)
      throw new Error(
        'That file is longer than 60,000 characters. Split it and attach one part at a time.',
      );
    return { name: file.name, mediaType: type, data: text };
  }
  const limit = type === 'application/pdf' ? attachmentLimits.pdf : attachmentLimits.image;
  if (file.size > limit)
    throw new Error(
      (type === 'application/pdf' ? 'PDFs' : 'Images') + ' can be up to ' + megabytes(limit) + '.',
    );
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
  return { name: file.name, mediaType: type, data: url.slice(url.indexOf(',') + 1) };
}

// Make changes: the DM says what should change, optionally with notes, a PDF or a photo, and approves each proposal.
export default function AssistantPanel({
  campaign,
  update,
  ai,
  busy,
  error,
  state,
  setState,
  propose,
  onOpenPage,
  onSetup,
}: {
  campaign: Campaign;
  update: (fn: (c: Campaign) => Campaign) => void;
  ai: boolean;
  busy: string;
  error: string;
  state: AssistState | null;
  setState: (s: AssistState | null) => void;
  propose: (request: string, attachment?: Attachment) => Promise<void>;
  onOpenPage: (id: string) => void;
  onSetup: () => void;
}) {
  const mine = state?.campaignId === campaign.id ? state : null;
  const [request, setRequest] = useState(mine?.request || '');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const pages = memoryOf(campaign).pages;
  const last = mine?.undo.at(-1);
  const submit = () => {
    if (busy || !ai || !request.trim()) return;
    void propose(request.trim(), attachment || undefined);
  };
  const mark = (id: string, s: AssistProposal['state']) =>
    mine &&
    setState({
      ...mine,
      proposals: mine.proposals.map((p) => (p.id === id ? { ...p, state: s } : p)),
    });
  function approve(p: AssistProposal) {
    if (!mine) return;
    const now = new Date().toISOString(),
      id = uid();
    const { undo } = applyProposal(campaign, p, now, id);
    update((c) => applyProposal(c, p, now, id).campaign);
    setState({
      ...mine,
      proposals: mine.proposals.map((x) => (x.id === p.id ? { ...x, state: 'applied' } : x)),
      undo: [...mine.undo, undo].slice(-30),
    });
  }
  function undoLast() {
    if (!mine || !last) return;
    update((c) => undoProposal(c, last));
    setState({
      ...mine,
      proposals: mine.proposals.map((x) =>
        x.id === last.proposalId ? { ...x, state: 'pending' } : x,
      ),
      undo: mine.undo.slice(0, -1),
    });
  }
  return (
    <form
      className="assist-panel"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label>
        What should change?
        <MentionTextarea
          rows={3}
          maxLength={4000}
          value={request}
          placeholder="Add the NPCs from these notes. Yara betrayed the party at the ferry."
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
      </label>
      <div className="assist-attach">
        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".txt,.md,.markdown,text/plain,text/markdown,application/pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setFileError('');
            try {
              setAttachment(await readAttachment(file));
            } catch (err) {
              setAttachment(null);
              setFileError(err instanceof Error ? err.message : 'Could not read that file.');
            }
          }}
        />
        {attachment ? (
          <span className="assist-file">
            <Paperclip size={13} /> {attachment.name}
            <button
              type="button"
              className="text-button"
              aria-label={'Remove ' + attachment.name}
              onClick={() => setAttachment(null)}
            >
              <X size={13} />
            </button>
          </span>
        ) : (
          <button type="button" className="button" onClick={() => fileInput.current?.click()}>
            <Paperclip size={14} /> Attach notes, a PDF or a photo
          </button>
        )}
        <span className="tiny muted">Claude reads it to propose changes. It is not saved.</span>
      </div>
      {fileError && (
        <p className="error-text" role="alert">
          {fileError}
        </p>
      )}
      {!ai && (
        <p className="tiny muted">
          Making changes uses Claude. Add your Anthropic API key in{' '}
          <button type="button" className="text-button" onClick={onSetup}>
            AI & backups
          </button>
          .
        </p>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button
          className="button primary"
          type="submit"
          disabled={!!busy || !ai || !request.trim()}
        >
          <Sparkles size={14} /> {busy === 'assist' ? 'Proposing…' : 'Propose changes'}
        </button>
      </div>
      {mine && (
        <section className="assist-proposals" aria-label="Proposed changes">
          {mine.reply && <p className="assist-reply">{mine.reply}</p>}
          {mine.proposals.map((p) => {
            const page = p.pageId ? pages.find((x) => x.id === p.pageId) : undefined;
            const changed = p.state === 'pending' && page && page.body !== p.before;
            return (
              <article key={p.id} className={'assist-change ' + p.state}>
                <span className="eyebrow">
                  {p.action === 'create' ? 'New page' : 'Update'} · {p.kind}
                </span>
                <h4>{p.title}</h4>
                {p.reason && <p className="assist-reason">{p.reason}</p>}
                {p.quote && <blockquote>{p.quote}</blockquote>}
                <MaterialBody body={p.body} />
                {p.before !== undefined && (
                  <details>
                    <summary>Text before this change</summary>
                    <MaterialBody body={p.before} />
                  </details>
                )}
                {changed && (
                  <p className="tiny muted">
                    This page has changed since Claude proposed this. Approving replaces the newer
                    text; Undo brings it back.
                  </p>
                )}
                <div className="assist-actions">
                  {p.state === 'pending' && (
                    <>
                      <button type="button" className="button primary" onClick={() => approve(p)}>
                        <Check size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => mark(p.id, 'skipped')}
                      >
                        Skip
                      </button>
                    </>
                  )}
                  {p.state === 'applied' && (
                    <>
                      <span className="assist-done">
                        <Check size={14} /> Approved
                      </span>
                      {mine.undo.find((u) => u.proposalId === p.id) && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() =>
                            onOpenPage(mine.undo.find((u) => u.proposalId === p.id)!.pageId)
                          }
                        >
                          <BookOpen size={13} /> Open page
                        </button>
                      )}
                    </>
                  )}
                  {p.state === 'skipped' && (
                    <>
                      <span className="assist-done">Skipped</span>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => mark(p.id, 'pending')}
                      >
                        Reconsider
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {!mine.proposals.length && <p className="tiny muted">Claude proposed no changes.</p>}
          {mine.left > 0 && (
            <p className="tiny muted">
              {mine.left === 1 ? 'One change was' : mine.left + ' changes were'} left out: the page
              is too long for Claude to rewrite whole. Edit it in the wiki.
            </p>
          )}
        </section>
      )}
      {last && (
        <div className="assist-undo">
          <button
            type="button"
            className="button"
            disabled={!canUndo(campaign, last)}
            onClick={undoLast}
          >
            <Undo2 size={14} /> Undo: {last.previous ? 'update to' : 'new page'} {last.title}
          </button>
          {!canUndo(campaign, last) && (
            <span className="tiny muted">Edited since. Use the page’s history to go back.</span>
          )}
        </div>
      )}
    </form>
  );
}
