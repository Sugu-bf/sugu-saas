import { http, HttpResponse } from "msw";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

/**
 * MSW handlers for dev/test environment.
 */
export const handlers = [
  // Auth: login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === "vendor@sugu.com" && body.password === "password") {
      return HttpResponse.json({
        data: {
          user: {
            id: 1,
            name: "Vendeur SUGU",
            email: "vendor@sugu.com",
            role: "vendor",
            avatar_url: null,
            email_verified_at: "2024-01-01T00:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
          },
          token: "mock-vendor-token-xxxx",
        },
        message: "Login successful",
      });
    }

    if (body.email === "agency@sugu.com" && body.password === "password") {
      return HttpResponse.json({
        data: {
          user: {
            id: 2,
            name: "Agence Express",
            email: "agency@sugu.com",
            role: "agency",
            avatar_url: null,
            email_verified_at: "2024-01-01T00:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
          },
          token: "mock-agency-token-xxxx",
        },
        message: "Login successful",
      });
    }

    return HttpResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }),

  // Auth: me
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json({
      data: {
        id: 1,
        name: "Vendeur SUGU",
        email: "vendor@sugu.com",
        role: "vendor",
        avatar_url: null,
        email_verified_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      },
    });
  }),

  // Auth: logout
  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ message: "Logged out" });
  }),

  // Vendor: dashboard
  http.get(`${API_BASE}/vendor/dashboard`, () => {
    return HttpResponse.json({
      data: {
        total_revenue: 2450000,
        total_orders: 156,
        pending_orders: 12,
        total_products: 48,
        revenue_change: 12.5,
        orders_change: -3.2,
      },
    });
  }),

  // Agency: dashboard
  http.get(`${API_BASE}/agency/dashboard`, () => {
    return HttpResponse.json({
      data: {
        total_deliveries: 342,
        pending_deliveries: 28,
        completed_deliveries: 314,
        total_revenue: 1850000,
        deliveries_change: 8.4,
        revenue_change: 5.1,
      },
    });
  }),
];
