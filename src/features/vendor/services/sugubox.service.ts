/**
 * Sugu Box Service — Seller Portal (Read-Only)
 * Handles: GET /sellers/sugubox/*
 */
import { api } from "@/lib/http/client";

// ── Types ──────────────────────────────────────────────────

export interface SuguBoxOverviewData {
  total_variants_in_box: number;
  total_units_in_box: number;
  pending_inbound_count: number;
  active_outbound_count: number;
  recent_movements: SuguBoxMovement[];
}

export interface SuguBoxMovement {
  id: string;
  movement_type: string;
  type_label: string;
  quantity: number;
  bin_code: string | null;
  variant: { title: string; sku: string; product_name: string } | null;
  reason_code?: string | null;
  note?: string | null;
  created_at: string;
}

export interface SuguBoxStockItem {
  variant_id: string;
  product_name: string;
  title: string;
  sku: string;
  global_qty: number;
  bins: {
    bin_id: string;
    bin_code: string;
    zone: string;
    aisle: string;
    warehouse: string;
    warehouse_id: string;
    qty: number;
  }[];
}

export interface SuguBoxInboundShipment {
  id: string;
  reference: string;
  status: string;
  status_label: string;
  warehouse: { id: string; name: string; code: string } | null;
  expected_at: string | null;
  received_at: string | null;
  lines_count: number;
  created_at: string;
}

export interface SuguBoxInboundDetail {
  id: string;
  reference: string;
  status: string;
  status_label: string;
  warehouse: { id: string; name: string; code: string } | null;
  expected_at: string | null;
  received_at: string | null;
  notes: string | null;
  lines: {
    id: string;
    variant: {
      id: string;
      title: string;
      sku: string;
      product_name: string;
      price_amount: number;
      currency: string;
    } | null;
    expected_qty: number;
    received_qty: number;
    bin_code: string | null;
  }[];
  created_at: string;
}

export interface SuguBoxOutboundOrder {
  id: string;
  reference: string;
  status: string;
  status_label: string;
  warehouse: { id: string; name: string; code: string } | null;
  expected_ship_at: string | null;
  shipped_at: string | null;
  lines_count: number;
  created_at: string;
}

export interface SuguBoxOutboundDetail {
  id: string;
  reference: string;
  status: string;
  status_label: string;
  warehouse: { id: string; name: string; code: string } | null;
  expected_ship_at: string | null;
  shipped_at: string | null;
  notes: string | null;
  lines: {
    id: string;
    variant: {
      id: string;
      title: string;
      sku: string;
      product_name: string;
    } | null;
    requested_qty: number;
    picked_qty: number;
    source_bin_code: string | null;
  }[];
  created_at: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

// ── API Calls ──────────────────────────────────────────────

export async function getSuguBoxOverview(): Promise<SuguBoxOverviewData> {
  const res = await api.get<{ success: boolean; data: SuguBoxOverviewData }>(
    "sellers/sugubox/overview",
  );
  return res.data;
}

export async function getSuguBoxStock(): Promise<SuguBoxStockItem[]> {
  const res = await api.get<{ success: boolean; data: SuguBoxStockItem[] }>(
    "sellers/sugubox/stock",
  );
  return res.data;
}

export async function getSuguBoxInbound(params?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}) {
  const res = await api.get<PaginatedResponse<SuguBoxInboundShipment>>(
    "sellers/sugubox/inbound",
    { params },
  );
  return res.data;
}

export async function getSuguBoxInboundDetail(
  id: string,
): Promise<SuguBoxInboundDetail> {
  const res = await api.get<{ success: boolean; data: SuguBoxInboundDetail }>(
    `sellers/sugubox/inbound/${id}`,
  );
  return res.data;
}

export async function getSuguBoxOutbound(params?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}) {
  const res = await api.get<PaginatedResponse<SuguBoxOutboundOrder>>(
    "sellers/sugubox/outbound",
    { params },
  );
  return res.data;
}

export async function getSuguBoxOutboundDetail(
  id: string,
): Promise<SuguBoxOutboundDetail> {
  const res = await api.get<{ success: boolean; data: SuguBoxOutboundDetail }>(
    `sellers/sugubox/outbound/${id}`,
  );
  return res.data;
}

export async function getSuguBoxMovements(params?: {
  type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}) {
  const res = await api.get<PaginatedResponse<SuguBoxMovement>>(
    "sellers/sugubox/movements",
    { params },
  );
  return res.data;
}
