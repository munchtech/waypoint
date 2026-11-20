// The renderer's local requests (window.waypoint.request) arrive here and go to the module that owns the path.
import type { LocalRequest, LocalResponse } from '../runtime';
import { aiRoute } from './ai';
import { appearanceRoute } from './appearance';
import { campaignsRoute } from './campaigns';
import { packsRoute } from './packs';
import { playersRoute } from './players';
import { rulesRoute } from './rules';

const routes = [playersRoute, aiRoute, rulesRoute, campaignsRoute, packsRoute, appearanceRoute];

export async function route(req: LocalRequest): Promise<LocalResponse> {
  if (
    !req ||
    typeof req.path !== 'string' ||
    !['GET', 'POST'].includes(req.method) ||
    (req.body && req.body.length > 64000000)
  )
    return { status: 400, body: { error: 'Invalid local request.' } };
  for (const answer of routes) {
    const res = await answer(req);
    if (res) return res;
  }
  return { status: 404, body: { error: 'Unknown local action.' } };
}
