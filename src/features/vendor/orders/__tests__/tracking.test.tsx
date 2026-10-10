import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { CircleCheckBig, HandHelping, MapPinCheck, PackageX, Receipt, ShoppingBag } from "lucide-react";
import { describe, expect, it } from "vitest";
import laravel from "../../../../../e2e/orders/laravel-order-tracking.json";
import { OrderTrackingBanner, OrderTrackingSteps } from "../components/order-tracking";
import { formatOrderDateTime } from "../components/order-bits";
import { parseOrderDetail, type OrderTracking } from "../contract";
import { UNDATED_LABEL, buildTrackingView, type TrackingView } from "../tracking";
import { detailPayload } from "./fixtures";

// `laravel-order-tracking.json` is written by the Laravel projection
// (../sugu, OrderTrackingProjectionTest): these tests read what the backend
// really answers, not a hand-made imitation of it.
const scenarios = laravel.scenarios as Record<string, OrderTracking>;

function viewOf(scenario: string, overrides: Record<string, unknown> = {}): TrackingView {
  const view = buildTrackingView(parseOrderDetail(detailPayload({ tracking: scenarios[scenario], ...overrides })));
  if (!view) throw new Error(`no tracking view for ${scenario}`);
  return view;
}

describe("contract with the Laravel projection", () => {
  it.each(Object.keys(scenarios))("parses the %s tracking as the backend sends it", (scenario) => {
    const order = parseOrderDetail(detailPayload({ tracking: scenarios[scenario] }));
    expect(order.tracking).toEqual(scenarios[scenario]);
  });

  it("is the same file as the backend fixture, when the backend repository is next to this one", () => {
    const backend = join(process.cwd(), "..", "sugu", "tests", "Fixtures", "Portal", "order-tracking.json");
    if (!existsSync(backend)) return;
    expect(laravel).toEqual(JSON.parse(readFileSync(backend, "utf8")));
  });

  it("keeps a kind, a flow or a state it does not know instead of rejecting the order", () => {
    const tracking = {
      ...scenarios.marketplace_pending,
      flow: "subscription",
      state: "on_hold",
      steps: scenarios.marketplace_pending.steps.map((step) => ({ ...step, kind: "reminder" })),
    };
    const view = buildTrackingView(parseOrderDetail(detailPayload({ tracking })));
    expect(view?.steps).toHaveLength(tracking.steps.length);
    expect(view?.stateLabel).toBe("Étape en cours");
  });

  it("reads an order without tracking as one from an older backend", () => {
    expect(parseOrderDetail(detailPayload()).tracking).toBeNull();
    expect(parseOrderDetail(detailPayload({ tracking: null })).tracking).toBeNull();
  });
});

describe("presentation mapping", () => {
  it.each(Object.keys(scenarios))("shows every step of %s, in the backend order, and adds none", (scenario) => {
    const view = viewOf(scenario);
    const sent = scenarios[scenario];

    expect(view.source).toBe("tracking");
    expect(view.steps.map((step) => [step.key, step.title, step.summary, step.status])).toEqual(
      sent.steps.map((step) => [step.key, step.title, step.summary, step.status]),
    );
    expect(view.current?.key ?? null).toBe(sent.current === null ? null : sent.steps[sent.current].key);
    expect(view.next?.key ?? null).toBe(sent.next === null ? null : sent.steps[sent.next].key);
    expect(view.progress).toEqual(sent.progress);
  });

  it.each(Object.keys(scenarios))("dates in %s only what the backend dated", (scenario) => {
    const view = viewOf(scenario);
    scenarios[scenario].steps.forEach((sent, index) => {
      const step = view.steps[index];
      if (sent.status === "upcoming") {
        // Not happened: no date, and no "not recorded" either.
        expect([step.dateTime, step.dateLabel]).toEqual([null, null]);
      } else if (sent.timestamp) {
        expect([step.dateTime, step.dateLabel]).toEqual([sent.timestamp, formatOrderDateTime(sent.timestamp)]);
      } else {
        expect([step.dateTime, step.dateLabel]).toEqual([null, UNDATED_LABEL]);
      }
    });
  });

  it("names the current step and the next one of an order waiting for the seller", () => {
    const view = viewOf("marketplace_pending");
    expect(view).toMatchObject({ stateLabel: "Étape en cours", tone: "info", progress: { done: 1, total: 6 } });
    expect(view.current).toMatchObject({ title: "Commande reçue", status: "current", tone: "info", icon: ShoppingBag });
    expect(view.next).toMatchObject({
      title: "Commande confirmée",
      summary: "À faire : confirmer que les articles sont disponibles.",
      status: "upcoming",
      tone: "neutral",
    });
  });

  it("closes a delivered order in success, with nothing next", () => {
    const view = viewOf("marketplace_delivered");
    expect(view).toMatchObject({ stateLabel: "Parcours terminé", tone: "success", next: null });
    expect(view.current).toMatchObject({ key: "delivered", tone: "success", icon: CircleCheckBig });
    expect(view.steps.every((step) => step.status !== "upcoming")).toBe(true);
    expect(view.steps.filter((step) => step.status === "done").every((step) => step.tone === "success")).toBe(true);
  });

  it("shows a counter sale as a sale and a handover, not as a delivery", () => {
    const view = viewOf("counter_sale", { isDirect: true });
    expect(view.steps.map((step) => [step.key, step.icon])).toEqual([
      ["placed", Receipt],
      ["delivered", HandHelping],
    ]);
    expect(view.steps.map((step) => step.title)).toEqual(["Vente enregistrée", "Remise au client"]);
  });

  it("keeps the payments of a COD Mixte order apart, the unpaid one still expected", () => {
    const view = viewOf("cod_mixte_product_unpaid");
    const [paid, unpaid] = ["delivery_fee_paid", "product_fee_paid"].map((key) => view.steps.find((step) => step.key === key)!);
    expect(paid).toMatchObject({ status: "done", tone: "success" });
    expect(paid.dateLabel).not.toBeNull();
    expect(unpaid).toMatchObject({ status: "upcoming", tone: "neutral", dateLabel: null });
    // Shipped at a moment nobody recorded: said so, not dated.
    expect(view.current).toMatchObject({ key: "in_transit", dateTime: null, dateLabel: UNDATED_LABEL });
  });

  it("marks a canceled order as interrupted: danger, no progress, no next step", () => {
    const view = viewOf("canceled");
    expect(view).toMatchObject({ stateLabel: "Parcours interrompu", tone: "danger", next: null, progress: null });
    expect(view.current).toMatchObject({ key: "canceled", exception: true, tone: "danger" });
  });

  it("warns about a failed delivery attempt while the order is still open", () => {
    const view = viewOf("delivery_failed");
    expect(view).toMatchObject({ stateLabel: "Étape en cours", tone: "warning" });
    expect(view.current).toMatchObject({ key: "delivery_failed", exception: true, tone: "warning", icon: PackageX });
    expect(view.next).toMatchObject({ key: "delivered", icon: MapPinCheck });
  });

  it("does not show as a date a timestamp that is not one", () => {
    const tracking = structuredClone(scenarios.marketplace_pending);
    tracking.steps[0].timestamp = "bientôt";
    const view = buildTrackingView(parseOrderDetail(detailPayload({ tracking })))!;
    expect(view.steps[0]).toMatchObject({ dateTime: null, dateLabel: UNDATED_LABEL });
  });
});

describe("missing data", () => {
  it("has nothing to draw when the backend sent no step at all", () => {
    expect(buildTrackingView(parseOrderDetail(detailPayload({ canonical_timeline: [] })))).toBeNull();
    expect(buildTrackingView(parseOrderDetail(detailPayload({ canonical_timeline: null })))).toBeNull();
    const empty = { ...scenarios.marketplace_pending, steps: [], current: null, next: null, progress: null };
    expect(buildTrackingView(parseOrderDetail(detailPayload({ tracking: empty })))).toBeNull();
  });

  it("falls back on canonical_timeline as received, without inventing a progress", () => {
    const timeline = [
      { key: "placed", label: "Commande reçue", status: "done", timestamp: "2026-10-08T09:30:00.000000Z", store_id: null, actor_type: null, description: null },
      { key: "vendor_confirmed", label: "Stock confirmé", status: "current", timestamp: "2026-10-08T10:00:00.000000Z", store_id: null, actor_type: null, description: "Commande confirmée par le vendeur." },
      { key: "collected", label: "Collecté", status: "upcoming", timestamp: null, store_id: "s1", actor_type: null, description: null },
    ];
    const view = buildTrackingView(parseOrderDetail(detailPayload({ statusCode: "confirmed", canonical_timeline: timeline })))!;

    expect(view).toMatchObject({ source: "timeline", stateLabel: "Étape en cours", progress: null });
    expect(view.steps.map((step) => [step.title, step.status])).toEqual([
      ["Commande reçue", "done"],
      ["Stock confirmé", "current"],
      ["Collecté", "upcoming"],
    ]);
    expect(view.current?.summary).toBe("Commande confirmée par le vendeur.");
    expect(view.next?.title).toBe("Collecté");
    expect(view.steps[2].dateLabel).toBeNull();
  });

  it("survives indexes that point outside the steps", () => {
    const tracking = { ...scenarios.marketplace_pending, current: 42, next: 43 };
    const view = buildTrackingView(parseOrderDetail(detailPayload({ tracking })))!;
    expect([view.current, view.next]).toEqual([null, null]);
  });
});

describe("rendering", () => {
  function renderTracking(scenario: string) {
    const view = viewOf(scenario);
    render(
      <>
        <OrderTrackingBanner view={view} />
        <OrderTrackingSteps view={view} />
      </>,
    );
    return {
      view,
      banner: screen.queryByRole("region", { name: "Étape en cours de la commande" }),
      steps: within(screen.getByRole("list", { name: "Étapes de la commande" })).getAllByRole("listitem"),
    };
  }

  it("answers the three questions for an order in progress", () => {
    const { banner, steps, view } = renderTracking("marketplace_collected");
    const region = within(banner!);

    // Where it stands.
    expect(region.getByText("Étape en cours")).toBeInTheDocument();
    expect(region.getByText(view.current!.title)).toBeInTheDocument();
    // How far.
    const progress = region.getByRole("progressbar", { name: "Progression de la commande" });
    expect(progress).toHaveAttribute("aria-valuenow", String(view.progress!.done));
    expect(progress).toHaveAttribute("aria-valuemax", String(view.progress!.total));
    expect(progress.children).toHaveLength(view.progress!.total);
    // What comes next.
    expect(region.getByText(`Prochaine étape : ${view.next!.title}.`)).toBeInTheDocument();

    // What happened: one item per backend step, the current one marked.
    expect(steps).toHaveLength(view.steps.length);
    const current = steps.filter((step) => step.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(within(current[0]).getByText("En cours")).toBeInTheDocument();
  });

  it("prints a date only for a reached step, as a machine-readable time", () => {
    const { steps, view } = renderTracking("cod_mixte_product_unpaid");
    view.steps.forEach((step, index) => {
      const time = steps[index].querySelector("time");
      if (step.dateTime) {
        expect(time).toHaveAttribute("datetime", step.dateTime);
        expect(time).toHaveTextContent(step.dateLabel!);
      } else {
        expect(time).toBeNull();
      }
      const undated = within(steps[index]).queryByText(UNDATED_LABEL);
      if (step.status !== "upcoming" && !step.dateTime) expect(undated).toBeInTheDocument();
      else expect(undated).toBeNull();
    });
  });

  it("says the state of each step to a screen reader", () => {
    const { steps, view } = renderTracking("marketplace_pending");
    view.steps.forEach((step, index) => {
      const label = { done: "(Terminé)", current: "En cours", upcoming: "(À venir)" }[step.status];
      expect(within(steps[index]).getByText(label)).toBeInTheDocument();
    });
  });

  it("draws no progress and no next step for an interrupted order", () => {
    const { banner } = renderTracking("canceled");
    const region = within(banner!);
    expect(region.getByText("Parcours interrompu")).toBeInTheDocument();
    expect(region.queryByRole("progressbar")).toBeNull();
    expect(region.queryByText(/Prochaine étape/)).toBeNull();
    expect(screen.queryByText("(À venir)")).toBeNull();
  });

  it("renders no banner when no step is the current one", () => {
    const tracking = { ...scenarios.marketplace_pending, current: null };
    const view = buildTrackingView(parseOrderDetail(detailPayload({ tracking })))!;
    render(<OrderTrackingBanner view={view} />);
    expect(screen.queryByRole("region")).toBeNull();
  });
});
