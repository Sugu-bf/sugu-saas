import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { Providers } from "@/components/providers";

/**
 * The portal is drawn in light mode only. A browser that kept a theme from
 * an earlier version of the portal (`sugu-theme` = "dark", or "system" on a
 * dark system) must not switch the `dark:` styles back on.
 */

const html = document.documentElement;

function darkSystem(dark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: dark && query.includes("dark"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  html.className = "";
  html.removeAttribute("style");
});

afterEach(() => {
  window.localStorage.clear();
});

describe("theme", () => {
  it.each([
    ["a stored dark theme", "dark", false],
    ["a stored system theme on a dark system", "system", true],
  ])("stays light with %s", async (_label, stored, system) => {
    darkSystem(system);
    window.localStorage.setItem("sugu-theme", stored);

    render(<Providers><p>Portail</p></Providers>);

    await waitFor(() => expect(html.className).not.toBe(""));
    expect(html.className).toBe("light");
  });
});
