import { z } from 'zod';

// Campaign maps: an image the DM adds, with pins placed on it. A pin can name a wiki page, and can be shown to players.
// Positions are fractions of the image's width and height, so a pin stays put however large the map is drawn.
export const MAP_IMAGE_MAX = 6_000_000,
  MAP_LIMIT = 24,
  PIN_LIMIT = 300,
  MAP_SIDE = 2400;
export const mapImage = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export const mapPin = z.object({
  id: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z.string().max(120),
  pageId: z.string().optional(),
  note: z.string().max(1000),
  shared: z.boolean(),
});
export const campaignMap = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  image: z.string().max(MAP_IMAGE_MAX).regex(mapImage),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  pins: z.array(mapPin).max(PIN_LIMIT),
  updated: z.string(),
});
export type MapPin = z.infer<typeof mapPin>;
export type CampaignMap = z.infer<typeof campaignMap>;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5);
export const titleFromFile = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 200) || 'Map';

export function newMap(
  seed: { title: string; image: string; width: number; height: number },
  id: string,
  now: string,
): CampaignMap {
  return {
    id,
    title: seed.title.trim().slice(0, 200) || 'Map',
    image: seed.image,
    width: Math.max(1, Math.round(seed.width)),
    height: Math.max(1, Math.round(seed.height)),
    pins: [],
    updated: now,
  };
}

// A new pin at (x, y), named after its page when it has one.
export function newPin(
  at: { x: number; y: number },
  id: string,
  page?: { id: string; title: string },
): MapPin {
  const pin: MapPin = {
    id,
    x: clamp01(at.x),
    y: clamp01(at.y),
    label: page ? page.title.slice(0, 120) : '',
    note: '',
    shared: false,
  };
  if (page) pin.pageId = page.id;
  return pin;
}

export function withPin(map: CampaignMap, pin: MapPin, now: string): CampaignMap {
  const fixed = { ...pin, x: clamp01(pin.x), y: clamp01(pin.y) };
  const has = map.pins.some((p) => p.id === pin.id);
  if (!has && map.pins.length >= PIN_LIMIT) return map;
  return {
    ...map,
    pins: has ? map.pins.map((p) => (p.id === pin.id ? fixed : p)) : [...map.pins, fixed],
    updated: now,
  };
}

export const withoutPin = (map: CampaignMap, pinId: string, now: string): CampaignMap => ({
  ...map,
  pins: map.pins.filter((p) => p.id !== pinId),
  updated: now,
});

// What a pin is called: its own label, else its page's name, else its place in the list.
export function pinName(pin: MapPin, pages: { id: string; title: string }[], i = 0) {
  return pin.label.trim() || pages.find((p) => p.id === pin.pageId)?.title || 'Pin ' + (i + 1);
}

// Every pin that names a page, across the campaign's maps: the wiki shows them as "On the map".
export function pinsForPage(maps: CampaignMap[] | undefined, pageId: string) {
  return (maps || []).flatMap((m) =>
    m.pins.filter((p) => p.pageId === pageId).map((pin) => ({ map: m, pin })),
  );
}

// The map as the players see it: the image and only the pins marked to show, with their names and no notes.
export function playerMap(map: CampaignMap, pages: { id: string; title: string }[]) {
  return {
    title: map.title,
    body: '',
    image: map.image,
    pins: map.pins
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.shared)
      .map(({ p, i }) => ({ x: p.x, y: p.y, label: pinName(p, pages, i) })),
  };
}

// Fit an image inside MAP_SIDE on its longest side.
export function fitted(width: number, height: number, side = MAP_SIDE) {
  const scale = Math.min(1, side / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
