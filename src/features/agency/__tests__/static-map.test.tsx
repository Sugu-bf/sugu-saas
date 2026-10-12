import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StaticMap } from "../components/static-map";

// Found on staging (V3.1): the content security policy served in front of the
// portal does not list the tile server. Every tile was refused, and the card
// showed broken pictures with the marker of the courier on nothing.

const OUAGADOUGOU = { lat: 12.3657, lng: -1.5339 };

function draw(point = OUAGADOUGOU) {
  return render(
    <StaticMap {...point} label="Carte : dernière position connue de Moussa" marker={<span data-testid="marker" />}>
      <p>Il y a 8 h</p>
    </StaticMap>,
  );
}

const tilesOf = (container: HTMLElement) => [...container.querySelectorAll("img")];

describe("StaticMap", () => {
  it("draws the tiles around the point, the marker on it and the credit of the map", () => {
    const { container } = draw();

    expect(tilesOf(container)).toHaveLength(15);
    expect(tilesOf(container)[0].getAttribute("src")).toMatch(/^https:\/\/tile\.openstreetmap\.org\/15\/\d+\/\d+\.png$/);
    expect(screen.getByRole("img", { name: "Carte : dernière position connue de Moussa" })).toBeTruthy();
    expect(screen.getByTestId("marker")).toBeTruthy();
    expect(screen.getByText("© OpenStreetMap")).toBeTruthy();
  });

  it("says that the map could not be loaded when no tile can be, and keeps what is laid over it", () => {
    const { container } = draw();

    for (const tile of tilesOf(container)) fireEvent.error(tile);

    expect(screen.getByText("Le fond de carte n'a pas pu être chargé.")).toBeTruthy();
    // No broken picture, no marker on nothing, no credit for a map that is not shown.
    expect(tilesOf(container)).toHaveLength(0);
    expect(screen.queryByTestId("marker")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText("© OpenStreetMap")).toBeNull();
    // When the position was recorded is still said.
    expect(screen.getByText("Il y a 8 h")).toBeTruthy();
  });

  it("keeps the map when a tile is lost and the others are drawn: its square is left empty", () => {
    const { container } = draw();
    const [first, second, third, ...others] = tilesOf(container);

    fireEvent.load(first);
    for (const tile of [second, third, ...others.slice(0, 3)]) fireEvent.error(tile);

    expect(screen.queryByText("Le fond de carte n'a pas pu être chargé.")).toBeNull();
    expect(tilesOf(container)).toHaveLength(15);
    expect(second.className).toContain("invisible");
    expect(first.className).not.toContain("invisible");
    expect(screen.getByTestId("marker")).toBeTruthy();
  });

  it("does not give up on one tile that fails before the others answer", () => {
    const { container } = draw();

    fireEvent.error(tilesOf(container)[0]);

    expect(screen.queryByText("Le fond de carte n'a pas pu être chargé.")).toBeNull();
    expect(screen.getByTestId("marker")).toBeTruthy();
  });

  it("starts again from nothing for another point", () => {
    const { container, rerender } = draw();
    for (const tile of tilesOf(container)) fireEvent.error(tile);
    expect(screen.getByText("Le fond de carte n'a pas pu être chargé.")).toBeTruthy();

    rerender(
      <StaticMap lat={14.6937} lng={-17.4441} label="Carte : dernière position connue de Awa" marker={<span data-testid="marker" />}>
        <p>À l&apos;instant</p>
      </StaticMap>,
    );

    expect(screen.queryByText("Le fond de carte n'a pas pu être chargé.")).toBeNull();
    expect(tilesOf(container)).toHaveLength(15);
  });
});
