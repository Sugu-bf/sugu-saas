"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/design-system";
import { MAP_TILE_ZOOM, mapTileUrl } from "@/lib/map-tiles";

// A map of one point, drawn with OpenStreetMap tiles: pictures laid side by
// side, the point in the middle. No script, no library, nothing to interact
// with — "Ouvrir l'itinéraire" next to it opens a real map.
//
// The tiles are asked of the portal itself (/api/map-tiles), which relays
// them: the content security policy served in front of pro.sugu.pro refuses
// an image from another site, the tile server included. When none of them
// can be loaded — no network, the tile server out of reach — the frame says
// so instead of showing broken pictures with a marker on nothing. What is
// laid over the map stays, and the link beside it still opens a real one.

const TILE = 256;
const ZOOM = MAP_TILE_ZOOM;
/** Tiles drawn around the one that holds the point: enough to fill a card on a wide screen. */
const COLUMNS = 5;
const ROWS = 3;
/** Tiles that failed, none having loaded, before the map is said unavailable: one lost tile is not a lost map. */
const FAILURES_BEFORE_GIVING_UP = 3;

/** Position of a point on the tile grid of a zoom level, in tiles (Web Mercator). */
export function tilePosition(lat: number, lng: number, zoom: number = ZOOM): { x: number; y: number } {
  const scale = 2 ** zoom;
  const latitude = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2) * scale,
  };
}

export interface StaticMapProps {
  lat: number;
  lng: number;
  /** What the map shows, for who cannot see it. */
  label: string;
  /** Drawn on the point. */
  marker: ReactNode;
  /**
   * Other places drawn on the same map, where they are from the point in the
   * middle. A place too far to be in the frame is simply out of it.
   */
  others?: { lat: number; lng: number; marker: ReactNode }[];
  /** Laid over a corner of the map (when the position was recorded…). */
  children?: ReactNode;
  className?: string;
  /** One of the zooms the portal relays (`MAP_TILE_ZOOMS`): 15 by default. */
  zoom?: number;
}

/** What became of the tiles of one view: how many are drawn, which ones could not be. */
interface Tiles {
  view: string;
  loaded: number;
  failed: ReadonlySet<number>;
}

export function StaticMap({ lat, lng, label, marker, others = [], children, className, zoom = ZOOM }: StaticMapProps) {
  const point = tilePosition(lat, lng, zoom);
  const [tileX, tileY] = [Math.floor(point.x), Math.floor(point.y)];
  const limit = 2 ** zoom;
  // How far the grid is pulled left and up so that the point sits in the middle of the frame.
  const offsetX = (Math.floor(COLUMNS / 2) + (point.x - tileX)) * TILE;
  const offsetY = (Math.floor(ROWS / 2) + (point.y - tileY)) * TILE;

  // Kept per view: another point draws other tiles, and starts from nothing.
  const view = `${zoom}/${tileX}/${tileY}`;
  const [kept, setKept] = useState<Tiles>({ view, loaded: 0, failed: new Set() });
  const tiles = kept.view === view ? kept : { view, loaded: 0, failed: new Set<number>() };
  const settle = (change: (current: Tiles) => Tiles) => setKept((previous) => change(previous.view === view ? previous : { view, loaded: 0, failed: new Set() }));
  const unavailable = tiles.loaded === 0 && tiles.failed.size >= FAILURES_BEFORE_GIVING_UP;

  return (
    <div className={cn("relative h-52 overflow-hidden rounded-control border border-border bg-surface-subtle", className)}>
      {unavailable ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-meta text-foreground-muted">Le fond de carte n&apos;a pas pu être chargé.</p>
      ) : (
        <div role="img" aria-label={label} className="absolute inset-0">
          <div
            className="absolute grid"
            aria-hidden="true"
            style={{
              gridTemplateColumns: `repeat(${COLUMNS}, ${TILE}px)`,
              left: `calc(50% - ${offsetX}px)`,
              top: `calc(50% - ${offsetY}px)`,
            }}
          >
            {Array.from({ length: ROWS * COLUMNS }, (_, index) => {
              const x = tileX - Math.floor(COLUMNS / 2) + (index % COLUMNS);
              const y = tileY - Math.floor(ROWS / 2) + Math.floor(index / COLUMNS);
              // Beyond the poles there is no tile; east and west, the world wraps.
              if (y < 0 || y >= limit) return <span key={index} style={{ width: TILE, height: TILE }} />;
              return (
                // eslint-disable-next-line @next/next/no-img-element -- map tiles: fixed 256px pictures relayed as they are, nothing for the image optimiser to do.
                <img
                  key={`${view}/${index}`}
                  src={mapTileUrl(((x % limit) + limit) % limit, y, zoom)}
                  alt=""
                  width={TILE}
                  height={TILE}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onLoad={() => settle((current) => ({ ...current, loaded: current.loaded + 1 }))}
                  onError={() => settle((current) => ({ ...current, failed: new Set(current.failed).add(index) }))}
                  // A tile that could not be loaded leaves its square empty, not a broken picture.
                  className={cn("block max-w-none select-none", tiles.failed.has(index) && "invisible")}
                />
              );
            })}
          </div>

          {others.map((other, index) => {
            const position = tilePosition(other.lat, other.lng, zoom);
            return (
              <div
                key={index}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                aria-hidden="true"
                style={{ left: `calc(50% + ${(position.x - point.x) * TILE}px)`, top: `calc(50% + ${(position.y - point.y) * TILE}px)` }}
              >
                {other.marker}
              </div>
            );
          })}

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            {marker}
          </div>
        </div>
      )}

      {children && <div className="absolute top-2 left-2 max-w-[calc(100%-1rem)]">{children}</div>}

      {!unavailable && (
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="absolute right-0 bottom-0 rounded-tl-compact bg-surface/90 px-1.5 py-0.5 text-meta text-foreground-muted hover:underline"
        >
          © OpenStreetMap
        </a>
      )}
    </div>
  );
}
