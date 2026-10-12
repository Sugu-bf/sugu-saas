// What the small maps of the portal and the route that serves their tiles
// agree on: one zoom level, and where a tile is asked.

/** Streets and blocks around a point: the only zoom the portal draws, and the only one its route relays. */
export const MAP_TILE_ZOOM = 15;

/** Address of a tile, on the portal's own origin (`/api/map-tiles/[z]/[x]/[y]`). */
export const mapTileUrl = (x: number, y: number): string => `/api/map-tiles/${MAP_TILE_ZOOM}/${x}/${y}`;
