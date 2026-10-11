import type { ReactNode } from "react";
import { cn } from "@/design-system";

// A map of one point, drawn with OpenStreetMap tiles: pictures laid side by
// side, the point in the middle. No script, no library, nothing to interact
// with — "Ouvrir l'itinéraire" next to it opens a real map.

const TILE = 256;
const ZOOM = 15;
/** Tiles drawn around the one that holds the point: enough to fill a card on a wide screen. */
const COLUMNS = 5;
const ROWS = 3;

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
  /** Laid over a corner of the map (when the position was recorded…). */
  children?: ReactNode;
  className?: string;
}

export function StaticMap({ lat, lng, label, marker, children, className }: StaticMapProps) {
  const point = tilePosition(lat, lng);
  const [tileX, tileY] = [Math.floor(point.x), Math.floor(point.y)];
  const limit = 2 ** ZOOM;
  // How far the grid is pulled left and up so that the point sits in the middle of the frame.
  const offsetX = (Math.floor(COLUMNS / 2) + (point.x - tileX)) * TILE;
  const offsetY = (Math.floor(ROWS / 2) + (point.y - tileY)) * TILE;

  return (
    <div className={cn("relative h-52 overflow-hidden rounded-control border border-border bg-surface-subtle", className)}>
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
            // eslint-disable-next-line @next/next/no-img-element -- map tiles: fixed 256px pictures from the tile server, nothing for the image optimiser to do.
            <img
              key={index}
              src={`https://tile.openstreetmap.org/${ZOOM}/${((x % limit) + limit) % limit}/${y}.png`}
              alt=""
              width={TILE}
              height={TILE}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block max-w-none select-none"
            />
          );
        })}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
        {marker}
      </div>
      </div>

      {children && <div className="absolute top-2 left-2 max-w-[calc(100%-1rem)]">{children}</div>}

      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute right-0 bottom-0 rounded-tl-compact bg-surface/90 px-1.5 py-0.5 text-meta text-foreground-muted hover:underline"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}
