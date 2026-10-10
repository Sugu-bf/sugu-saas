import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http/api-error";

const getMock = vi.fn();
const postMock = vi.fn();
const fetchMock = vi.fn();
vi.mock("@/lib/http/client", () => ({
  api: { get: (...args: unknown[]) => getMock(...args), post: (...args: unknown[]) => postMock(...args) },
  apiFetch: (...args: unknown[]) => fetchMock(...args),
}));

import {
  ORDERS_PAGE_SIZE,
  exportOrdersCsv,
  fetchInvoiceLink,
  fetchOrderCounts,
  fetchOrders,
  fetchPickupCodes,
  runOrderAction,
} from "../api";
import { listRow } from "./fixtures";

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  fetchMock.mockReset();
});

describe("fetchOrders", () => {
  it("sends the search, the filters, the sort and the page to the server", async () => {
    getMock.mockResolvedValue({ data: { data: [listRow()], total: 61 } });

    const page = await fetchOrders({
      page: 3,
      status: "canceled",
      search: "  awa  ",
      origin: "direct",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-10",
      sort: "amount",
      direction: "asc",
    });

    expect(getMock).toHaveBeenCalledWith("sellers/orders", {
      params: {
        status: "canceled",
        search: "awa",
        origin: "direct",
        date_from: "2026-10-01",
        date_to: "2026-10-10",
        sort: "amount",
        direction: "asc",
        page: 3,
        limit: ORDERS_PAGE_SIZE,
      },
    });
    // The total is the server's, not the number of rows received.
    expect(page).toMatchObject({ total: 61, page: 3, pageSize: ORDERS_PAGE_SIZE });
  });

  it("omits empty filters instead of sending blanks", async () => {
    getMock.mockResolvedValue({ data: { data: [], total: 0 } });
    await fetchOrders({ page: 1, status: "", search: "   " });
    const params = getMock.mock.calls[0][1].params;
    expect(params.status).toBeUndefined();
    expect(params.search).toBeUndefined();
  });

  it("lets a failure through: an outage is never an empty list", async () => {
    getMock.mockRejectedValue(new ApiError({ status: 500, message: "boom" }));
    await expect(fetchOrders({ page: 1 })).rejects.toBeInstanceOf(ApiError);
  });

  it("refuses a payload that is not a list", async () => {
    getMock.mockResolvedValue({ data: [] });
    await expect(fetchOrders({ page: 1 })).rejects.toThrow();
  });
});

describe("fetchOrderCounts", () => {
  it("reads the per-status counters", async () => {
    getMock.mockResolvedValue({ data: { total: 4, byStatus: { pending: 1, canceled: 3 } } });
    await expect(fetchOrderCounts()).resolves.toEqual({ total: 4, byStatus: { pending: 1, canceled: 3 } });
  });
});

describe("runOrderAction", () => {
  it.each([
    ["confirm", "confirm"],
    ["cancel", "cancel"],
    ["requestDelivery", "request-delivery"],
    ["markShipped", "mark-shipped"],
    ["markDelivered", "mark-delivered"],
  ] as const)("%s posts to %s", async (action, endpoint) => {
    postMock.mockResolvedValue({ success: true });
    await runOrderAction("o1", action);
    expect(postMock).toHaveBeenCalledWith(`sellers/orders/o1/${endpoint}`);
  });

  it("lets the server's refusal through", async () => {
    postMock.mockRejectedValue(new ApiError({ status: 422, message: "SUGU-COD-MIXTE-FEES-UNPAID: …" }));
    await expect(runOrderAction("o1", "markDelivered")).rejects.toMatchObject({ status: 422 });
  });
});

describe("fetchPickupCodes", () => {
  it("answers no code while the backend says 404 (no courier yet)", async () => {
    getMock.mockRejectedValue(new ApiError({ status: 404, message: "Code disponible après acceptation coursier." }));
    await expect(fetchPickupCodes("o1")).resolves.toEqual([]);
  });

  it("does not hide another failure behind an empty list", async () => {
    getMock.mockRejectedValue(new ApiError({ status: 500, message: "boom" }));
    await expect(fetchPickupCodes("o1")).rejects.toMatchObject({ status: 500 });
  });
});

describe("exportOrdersCsv", () => {
  it("asks the server for the filtered population, or for the selection", async () => {
    const createObjectURL = vi.fn(() => "blob:x");
    // jsdom cannot follow the download link.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    fetchMock.mockResolvedValue(new Response("ref;date", { status: 200, headers: { "content-type": "text/csv" } }));

    await exportOrdersCsv({ status: "pending", search: "awa" }, ["a", "b"]);

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("sellers/orders/export");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ status: "pending", search: "awa", ids: ["a", "b"] });
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("turns a refused export into an ApiError carrying the server message", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Erreur lors de l'export des commandes." }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(exportOrdersCsv({})).rejects.toMatchObject({ status: 500 });
  });

  it("reports a network failure as such", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(exportOrdersCsv({})).rejects.toMatchObject({ status: 0 });
  });
});

describe("fetchInvoiceLink", () => {
  it("builds the public link from the access token", async () => {
    getMock.mockResolvedValue({ access_token: "tok", invoice_number: "FAC-12" });
    await expect(fetchInvoiceLink("o1", "https://sugu.pro/")).resolves.toEqual({
      url: "https://sugu.pro/invoices/tok",
      invoiceNumber: "FAC-12",
    });
  });

  it("fails rather than returning an empty link", async () => {
    getMock.mockResolvedValue({});
    await expect(fetchInvoiceLink("o1", "https://sugu.pro")).rejects.toBeInstanceOf(ApiError);
  });
});
