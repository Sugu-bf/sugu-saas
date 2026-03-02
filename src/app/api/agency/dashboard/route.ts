import { NextResponse } from "next/server";

/**
 * GET /api/agency/dashboard
 * Mock agency dashboard stats.
 */
export async function GET() {
  return NextResponse.json({
    data: {
      total_deliveries: 342,
      pending_deliveries: 28,
      completed_deliveries: 314,
      total_revenue: 1850000,
      deliveries_change: 8.4,
      revenue_change: 5.1,
    },
  });
}
