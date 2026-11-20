// Update packs as files, read when the app asks for them: the packs that ship in the app's data folder, and any the DM
// drops into the packs folder in the app data, which win when both have the same id. A new revision of a pack needs
// only a new file, not a new build of the app.
import fs from 'node:fs';
import path from 'node:path';
import { updatePackSchema, type UpdatePack } from '../lib/update-pack';

export type PackInfo = { id: string; title: string; match: UpdatePack['match'] };
const LIMIT = 8_000_000;

export class PackFolders {
  // Each file is parsed once, and again only when its size or modified time changes.
  private cache = new Map<string, { mtime: number; size: number; pack: UpdatePack | null }>();
  constructor(
    private bundled: string,
    readonly user: string,
  ) {}
  private read(file: string) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(file);
    } catch {
      return null;
    }
    const known = this.cache.get(file);
    if (known && known.mtime === stat.mtimeMs && known.size === stat.size) return known.pack;
    let pack: UpdatePack | null = null;
    if (stat.isFile() && stat.size <= LIMIT)
      try {
        const parsed = updatePackSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
        if (parsed.success) pack = parsed.data;
      } catch {}
    this.cache.set(file, { mtime: stat.mtimeMs, size: stat.size, pack });
    return pack;
  }
  private all() {
    const packs = new Map<string, UpdatePack>();
    for (const dir of [this.bundled, this.user]) {
      let names: string[];
      try {
        names = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.json'));
      } catch {
        continue;
      }
      for (const name of names.sort()) {
        const pack = this.read(path.join(dir, name));
        if (pack) packs.set(pack.id, pack);
      }
    }
    return packs;
  }
  list(): PackInfo[] {
    return [...this.all().values()].map(({ id, title, match }) => ({ id, title, match }));
  }
  get(id: string) {
    return this.all().get(id) || null;
  }
}
