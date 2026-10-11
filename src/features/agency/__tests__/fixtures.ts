// Payloads as Laravel answers them (AgencyShipmentService::formatShipmentRow,
// CourierManagementController, AgencyDashboardController), for the contract
// tests. Amounts in centimes, as on the wire.

type Json = Record<string, unknown>;

export function rawRow(overrides: Json = {}): Json {
  return {
    id: "01JSHIPMENT0001",
    order: {
      id: "01JORDER0001",
      order_number: "SU-2026-000042",
      items_count: 2,
      total: 1500000,
      payment_status: "paid",
      shipping_address: { name: "Awa Ndiaye", phone: "+226 70 12 34 56", line1: "Avenue Kwame Nkrumah", city: "Ouagadougou" },
      store: { id: "s1", name: "Atelier Wend-Kuni", slug: null, address_line1: "Marché Rood-Woko" },
      delivery_notes: "Appeler avant de passer.",
    },
    courier: {
      id: "courier-profile-1",
      user_id: "user-1",
      name: "Moussa Kaboré",
      phone: "+226 70 10 20 30",
      vehicle_type: "moto",
      average_rating: 4.7,
      is_available: true,
    },
    status: "assigned",
    shipping_amount: 150000,
    items_count: 2,
    eta: null,
    picked_at: null,
    delivered_at: null,
    created_at: "2026-10-11T14:24:00+00:00",
    priority: 100,
    cod_mixte: null,
    agency_accepted_at: "2026-10-11T14:28:00+00:00",
    agency_refused_at: null,
    agency_refusal_reason: null,
    zone: { id: "zone-centre", name: "Centre" },
    source: "marketplace",
    pickup: { name: "Atelier Wend-Kuni", address: "Marché Rood-Woko", phone: null },
    late: false,
    awaiting_decision: false,
    next_statuses: ["in_transit", "pending", "delivery_failed"],
    can_assign: false,
    can_reassign: true,
    ...overrides,
  };
}

export function rawDetail(overrides: Json = {}): Json {
  const row = rawRow();
  return {
    ...row,
    courier_phone: "+226 70 10 20 30",
    order: {
      ...(row.order as Json),
      payment_method: "mobile_money",
      created_at: "2026-10-11T14:24:00+00:00",
      shipping_address_line2: "2e étage",
      items: [{ name: "Pagne tissé", qty: 2, unit_price: 750000, image: null, collected: false }],
    },
    courier: {
      ...(row.courier as Json),
      employee_id: "LV-001",
      vehicle_plate: "11 KK 4521",
      total_deliveries: 125,
      success_rate: 96,
      rating_count: 28,
    },
    status_updated_at: "2026-10-11T14:40:00+00:00",
    tracking_events: [],
    notes: [{ id: "n1", code: "", memo: "Le client préfère un appel.", noted_at: "2026-10-11T15:20:00+00:00", author: "Manager" }],
    journey: {
      state: "in_progress",
      steps: [
        { key: "received", status: "done", timestamp: "2026-10-11T14:24:00+00:00" },
        { key: "accepted", status: "done", timestamp: "2026-10-11T14:28:00+00:00" },
        { key: "assigned", status: "current", timestamp: null },
        { key: "picked_up", status: "upcoming", timestamp: null },
        { key: "in_transit", status: "upcoming", timestamp: null },
        { key: "delivered", status: "upcoming", timestamp: null },
      ],
    },
    schedule: { scheduled_at: null, date: null, from: null, to: null },
    delivery_instructions: null,
    recipient: { email: "awa@example.test", deliveries_count: 3 },
    position: { lat: 12.3657, lng: -1.5339, recorded_at: "2026-10-11T15:57:00+00:00", distance_km: 2.1 },
    ...overrides,
  };
}

export function rawCourier(overrides: Json = {}): Json {
  return {
    id: "courier-profile-1",
    user_id: "user-1",
    delivery_partner_id: "21",
    branch_id: null,
    employee_id: "LV-001",
    vehicle_type: "moto",
    vehicle_plate: "11 KK 4521",
    phone_e164: "+22670102030",
    emergency_contact_name: null,
    emergency_contact_phone: null,
    status: "active",
    is_active: true,
    kyc_verified: true,
    suspended_until: null,
    kyc_verified_at: "2026-03-10T09:00:00+00:00",
    total_deliveries: 584,
    completed_deliveries: 566,
    failed_deliveries: 18,
    rating_avg: 4.7,
    rating_count: 128,
    hired_at: "2026-03-05",
    last_delivery_at: "2026-10-11",
    metadata: { quartier: "Gounghin", address: "Gounghin, Ouagadougou", vehicle_make: "Yamaha YBR 125", vehicle_color: "Noir", vehicle_year: "2022" },
    created_at: "2026-03-05T08:00:00+00:00",
    activity: "on_delivery",
    active_shipments: 2,
    deliveries_today: 3,
    revenue_today: 550000,
    success_rate: 96.9,
    last_activity_at: "2026-10-11T15:57:00+00:00",
    user: { id: "user-1", name: "Moussa Kaboré", email: "moussa@example.test", phone_e164: "+226 70 10 20 30" },
    branch: null,
    kyc_documents: [{ id: "d1", document_type: "id_card", document_number: "B 1000000", expires_on: "2029-01-01", status: 1, reviewed_at: null, file_url: null }],
    ...overrides,
  };
}

export const rawOverview = { awaitingDecision: 3, toAssign: 5, onTheWay: 12, deliveredToday: 6, deliveredYesterday: 3, failed: 3, late: 3 };
export const rawCourierOverview = { total: 8, active: 6, onDelivery: 4, available: 1, paused: 1, toVerify: 1, suspended: 1 };
