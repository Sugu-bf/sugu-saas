// What the small maps of the portal and the route that serves their tiles
// agree on: the zoom levels, and where a tile is asked.

/** Streets and blocks around a point: the zoom of a position (a courier, a store). */
export const MAP_TILE_ZOOM = 15;

/** A town and the communes around it: the zoom of the delivery zones of an agency. */
export const MAP_AREA_ZOOM = 10;

/** The only zooms the portal draws, and the only ones its route relays. */
export const MAP_TILE_ZOOMS: readonly number[] = [MAP_AREA_ZOOM, MAP_TILE_ZOOM];

/** Address of a tile, on the portal's own origin (`/api/map-tiles/[z]/[x]/[y]`). */
export const mapTileUrl = (x: number, y: number, zoom: number = MAP_TILE_ZOOM): string => `/api/map-tiles/${zoom}/${x}/${y}`;
