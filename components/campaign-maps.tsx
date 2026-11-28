'use client';
import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import {
  ArrowUpRight,
  ImagePlus,
  MapPin as PinIcon,
  Minus,
  Monitor,
  Plus,
  Trash2,
} from 'lucide-react';
import { uid, type Campaign } from '../lib/campaign';
import { memoryOf } from '../lib/memory';
import { pageName } from '../lib/page-name';
import { appFetch, isDesktop } from '../lib/transport';
import {
  MAP_IMAGE_MAX,
  MAP_LIMIT,
  PIN_LIMIT,
  fitted,
  newMap,
  newPin,
  pinName,
  playerMap,
  titleFromFile,
  withPin,
  withoutPin,
  type CampaignMap,
  type MapPin,
} from '../lib/maps';

const zooms = [1, 1.5, 2, 3, 4];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Shrink the image to fit MAP_SIDE and store it as WebP (JPEG where WebP cannot be written), lowering quality until it fits.
async function readMapImage(file: File) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type))
    throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 80_000_000) throw new Error('That image is too large. Choose one under 80 MB.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That image could not be read.');
  }
  const { width, height } = fitted(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  for (const quality of [0.85, 0.72, 0.6, 0.45]) {
    let image = canvas.toDataURL('image/webp', quality);
    if (!image.startsWith('data:image/webp')) image = canvas.toDataURL('image/jpeg', quality);
    if (image.length <= MAP_IMAGE_MAX) return { image, width, height };
  }
  throw new Error('That map has too much detail to keep. Try a smaller image.');
}

// The map's name saves when the field is left with something in it; an empty name goes back to the saved one.
function MapTitle({ title, save }: { title: string; save: (title: string) => void }) {
  const [value, setValue] = useState(title);
  const commit = () => {
    const next = value.trim().slice(0, 200);
    if (next && next !== title) save(next);
    else setValue(title);
  };
  return (
    <input
      className="map-title"
      aria-label="Map name"
      value={value}
      maxLength={200}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

// Maps for the campaign: an image with pins on it. A pin can name a wiki page, carry a DM note, and be shown to players.
export default function CampaignMaps({
  campaign,
  update,
  initial,
  onOpenPage,
}: {
  campaign: Campaign;
  update: (fn: (c: Campaign) => Campaign) => void;
  // "mapId" or "mapId:pinId", from search or a wiki page's "On the map".
  initial?: string;
  onOpenPage: (id: string) => void;
}) {
  const memory = memoryOf(campaign),
    maps = memory.maps || [];
  const pages = memory.pages
    .map((p) => ({ id: p.id, title: pageName(p), kind: p.kind }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const [first, firstPin] = (initial || '').split(':');
  const [mapId, setMapId] = useState(maps.some((m) => m.id === first) ? first : maps[0]?.id || '');
  const [pinId, setPinId] = useState(firstPin || '');
  const [placing, setPlacing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    sx: number;
    sy: number;
    moved: boolean;
  } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const map = maps.find((m) => m.id === mapId) || maps[0];
  const pin = map?.pins.find((p) => p.id === pinId);
  const desktop = isDesktop();

  const saveMaps = (fn: (list: CampaignMap[]) => CampaignMap[]) =>
    update((c) => {
      const m = memoryOf(c);
      return { ...c, memory: { ...m, maps: fn(m.maps || []) } };
    });
  const saveMap = (id: string, fn: (m: CampaignMap) => CampaignMap) =>
    saveMaps((list) => list.map((m) => (m.id === id ? fn(m) : m)));
  const savePin = (next: MapPin) => {
    if (map) saveMap(map.id, (m) => withPin(m, next, new Date().toISOString()));
  };

  async function addMap(f: File | undefined) {
    if (!f) return;
    setError('');
    setMessage('');
    if (maps.length >= MAP_LIMIT) {
      setError(`A campaign can hold ${MAP_LIMIT} maps. Remove one to add another.`);
      return;
    }
    setBusy(true);
    try {
      const read = await readMapImage(f);
      const made = newMap(
        { title: titleFromFile(f.name), ...read },
        uid(),
        new Date().toISOString(),
      );
      saveMaps((list) => [...list, made]);
      setMapId(made.id);
      setPinId('');
      setZoom(1);
      setPlacing(false);
      setMessage('Map added. Choose Add pin, then click the map to mark a place.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const pointAt = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    };
  };
  function place(e: MouseEvent<HTMLDivElement>) {
    if (!placing || !map) return;
    if (map.pins.length >= PIN_LIMIT) {
      setError(`A map can hold ${PIN_LIMIT} pins.`);
      setPlacing(false);
      return;
    }
    const made = newPin(pointAt(e), uid());
    savePin(made);
    setPinId(made.id);
    setPlacing(false);
  }
  function startDrag(e: PointerEvent<HTMLButtonElement>, p: MapPin) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: p.id, x: p.x, y: p.y, sx: e.clientX, sy: e.clientY, moved: false });
  }
  function moveDrag(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4;
    if (moved) setDrag({ ...drag, ...pointAt(e), moved });
  }
  function endDrag(p: MapPin) {
    if (drag?.moved) savePin({ ...p, x: drag.x, y: drag.y });
    setDrag(null);
  }
  function nudge(e: KeyboardEvent<HTMLButtonElement>, p: MapPin) {
    const step = e.shiftKey ? 0.02 : 0.005;
    const d = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    savePin({ ...p, x: clamp01(p.x + d[0]), y: clamp01(p.y + d[1]) });
  }
  async function showPlayers() {
    if (!map) return;
    setBusy(true);
    setError('');
    try {
      const r = await appFetch('/api/player/show', {
        method: 'POST',
        body: JSON.stringify(playerMap(map, pages)),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error || 'Could not open the player display.');
      const shown = map.pins.filter((p) => p.shared).length;
      setMessage(
        `Showing ${map.title} on the player display with ${shown} ${shown === 1 ? 'pin' : 'pins'}. DM notes and other pins stay hidden.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function removeMap() {
    if (!map) return;
    const rest = maps.filter((m) => m.id !== map.id);
    saveMaps((list) => list.filter((m) => m.id !== map.id));
    setMapId(rest[0]?.id || '');
    setPinId('');
    setRemoving(false);
    setMessage(`Removed ${map.title}.`);
  }

  const picker = (
    <>
      <input
        ref={file}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          void addMap(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button
        className={'button' + (maps.length ? '' : ' primary')}
        disabled={busy || !desktop}
        onClick={() => file.current?.click()}
      >
        <ImagePlus size={15} /> {busy ? 'Adding…' : 'Add a map'}
      </button>
    </>
  );

  if (!map)
    return (
      <section className="paper maps-empty">
        <span className="eyebrow">MAPS</span>
        <h2>Add your first map</h2>
        <p className="muted">
          Add a map image (PNG, JPEG or WebP), then pin places, people and secrets on it. A pin can
          open its wiki page, and you choose which pins the players see.
        </p>
        {desktop ? picker : <p className="tiny muted">Add maps in the Waypoint desktop app.</p>}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </section>
    );

  const ratio = map.width / map.height;
  const shownPins = map.pins.map((p) =>
    drag?.moved && drag.id === p.id ? { ...p, x: drag.x, y: drag.y } : p,
  );
  const linked = pin?.pageId ? pages.find((p) => p.id === pin.pageId) : undefined;
  return (
    <div className="maps-view">
      <div className="maps-bar">
        {maps.length > 1 && (
          <select
            aria-label="Choose map"
            value={map.id}
            onChange={(e) => {
              setMapId(e.target.value);
              setPinId('');
              setPlacing(false);
              setRemoving(false);
              setZoom(1);
            }}
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        )}
        <MapTitle
          key={map.id}
          title={map.title}
          save={(title) => saveMap(map.id, (m) => ({ ...m, title }))}
        />
        {picker}
      </div>
      {(message || error) && (
        <p className={error ? 'error-text' : 'tiny muted'} role={error ? 'alert' : 'status'}>
          {error || message}
        </p>
      )}
      <div className="map-layout">
        <section className="map-board">
          <div className="map-tools">
            <button
              className={'button' + (placing ? ' primary' : '')}
              aria-pressed={placing}
              onClick={() => setPlacing(!placing)}
            >
              <PinIcon size={15} /> {placing ? 'Click the map…' : 'Add pin'}
            </button>
            <div className="map-zoom" role="group" aria-label="Zoom">
              <button
                className="button"
                aria-label="Zoom out"
                disabled={zoom === zooms[0]}
                onClick={() => setZoom(zooms[Math.max(0, zooms.indexOf(zoom) - 1)])}
              >
                <Minus size={15} />
              </button>
              <span aria-live="polite">{Math.round(zoom * 100)}%</span>
              <button
                className="button"
                aria-label="Zoom in"
                disabled={zoom === zooms.at(-1)}
                onClick={() => setZoom(zooms[Math.min(zooms.length - 1, zooms.indexOf(zoom) + 1)])}
              >
                <Plus size={15} />
              </button>
            </div>
            {desktop && (
              <button className="button" disabled={busy} onClick={() => void showPlayers()}>
                <Monitor size={15} /> Show to players
              </button>
            )}
          </div>
          <div className="map-scroll">
            <div
              ref={stage}
              className={'map-stage' + (placing ? ' placing' : '')}
              style={{
                width: `calc(min(100%, ${(70 * ratio).toFixed(3)}vh) * ${zoom})`,
                aspectRatio: `${map.width} / ${map.height}`,
              }}
              onClick={place}
            >
              <img src={map.image} alt={map.title} draggable={false} />
              {shownPins.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={
                    'map-pin' +
                    (p.id === pin?.id ? ' selected' : '') +
                    (p.shared ? ' shared' : '') +
                    (drag?.id === p.id && drag.moved ? ' dragging' : '')
                  }
                  style={{ left: p.x * 100 + '%', top: p.y * 100 + '%' }}
                  aria-label={pinName(p, pages, i) + (p.shared ? ', players can see' : '')}
                  aria-pressed={p.id === pin?.id}
                  onPointerDown={(e) => startDrag(e, p)}
                  onPointerMove={moveDrag}
                  onPointerUp={() => endDrag(p)}
                  onPointerCancel={() => setDrag(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinId(p.id);
                    setPlacing(false);
                  }}
                  onKeyDown={(e) => nudge(e, p)}
                >
                  <PinIcon size={22} aria-hidden="true" />
                  <span>{pinName(p, pages, i)}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="tiny muted">
            Drag a pin to move it, or select it and use the arrow keys (Shift moves further).
          </p>
        </section>
        <aside className="map-side">
          {pin ? (
            <div className="pin-editor">
              <span className="eyebrow">PIN</span>
              <label>
                Name on the map
                <input
                  value={pin.label}
                  maxLength={120}
                  placeholder={linked?.title || 'Name this place'}
                  onChange={(e) => savePin({ ...pin, label: e.target.value })}
                />
              </label>
              <label>
                Wiki page
                <select
                  value={pin.pageId || ''}
                  onChange={(e) => {
                    const next = { ...pin };
                    if (e.target.value) next.pageId = e.target.value;
                    else delete next.pageId;
                    savePin(next);
                  }}
                >
                  <option value="">No page</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · {p.kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                DM note
                <textarea
                  rows={3}
                  value={pin.note}
                  maxLength={1000}
                  onChange={(e) => savePin({ ...pin, note: e.target.value })}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={pin.shared}
                  onChange={(e) => savePin({ ...pin, shared: e.target.checked })}
                />
                <span>Players can see this pin</span>
              </label>
              <div className="pin-actions">
                {linked && (
                  <button className="button" onClick={() => onOpenPage(linked.id)}>
                    <ArrowUpRight size={15} /> Open page
                  </button>
                )}
                <button
                  className="button"
                  onClick={() => {
                    saveMap(map.id, (m) => withoutPin(m, pin.id, new Date().toISOString()));
                    setPinId('');
                  }}
                >
                  <Trash2 size={15} /> Remove pin
                </button>
                <button className="text-button" onClick={() => setPinId('')}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <p className="tiny muted">
              {map.pins.length
                ? 'Select a pin to name it, link a wiki page or share it with players.'
                : 'No pins yet. Choose Add pin, then click the map.'}
            </p>
          )}
          {map.pins.length > 0 && (
            <ul className="pin-list" aria-label="Pins on this map">
              {map.pins.map((p, i) => (
                <li key={p.id}>
                  <button
                    className={'text-button' + (p.id === pin?.id ? ' current' : '')}
                    onClick={() => {
                      setPinId(p.id);
                      setPlacing(false);
                    }}
                  >
                    {pinName(p, pages, i)}
                  </button>
                  {p.shared && <small>Players see</small>}
                </li>
              ))}
            </ul>
          )}
          <div className="map-remove">
            {removing ? (
              <>
                <p className="tiny">
                  Remove {map.title}
                  {map.pins.length ? ` and its ${map.pins.length} pins` : ''}? A restore point can
                  bring it back.
                </p>
                <button className="button" onClick={removeMap}>
                  Remove map
                </button>
                <button className="text-button" onClick={() => setRemoving(false)}>
                  Keep it
                </button>
              </>
            ) : (
              <button className="text-button" onClick={() => setRemoving(true)}>
                <Trash2 size={14} /> Remove this map
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
