// Payloads shaped like SellerOrderService::formatOrder / formatOrderDetails
// (../sugu). Amounts in francs, as the backend answers them.

type Overrides = Record<string, unknown>;

export function listRow(overrides: Overrides = {}): Record<string, unknown> {
  return {
    id: "01JORDER0000000000000000A1",
    reference: "SU-2026-000042",
    displayId: "SU-2026-000042",
    date: "2026-10-08T09:30:00.000000Z",
    customer: { name: "Awa Traoré", email: "awa@example.test", phone: "+22670112233", avatar: null },
    channel: null,
    isSugu: false,
    isDirect: false,
    statusCode: "pending",
    status: "En attente",
    paymentStatus: "Payée",
    paymentStatusCode: "paid",
    is_cod: false,
    cod_flow_type: null,
    cod_current_step: null,
    delivery_fee_paid: false,
    product_fee_paid: false,
    itemCount: 1,
    totalAmount: 12500,
    currency: "XOF",
    items: [{ name: "Pagne tissé", quantity: 1, image: null }],
    actions: { confirm: true, cancel: true, requestDelivery: false, markShipped: false, markDelivered: false },
    ...overrides,
  };
}

export function detailPayload(overrides: Overrides = {}): Record<string, unknown> {
  return {
    id: "01JORDER0000000000000000A1",
    reference: "SU-2026-000042",
    createdAt: "2026-10-08T09:30:00.000000Z",
    channel: null,
    isDirect: false,
    statusCode: "pending",
    status: "pending",
    parties: {
      client: {
        id: "u1",
        name: "Awa Traoré",
        role: "client",
        location: "Ouagadougou, Secteur 15",
        phone: "+22670112233",
        email: "awa@example.test",
      },
      seller: { id: "current", name: "Boutique Awa", role: "seller", location: "Siège" },
      driver: null,
    },
    items: [
      { id: "i1", name: "Pagne tissé", variant: "Standard", quantity: 2, price: 3000, total: 6000, image: null, storeId: "s1" },
      { id: "i2", name: "Chemise", variant: "Rouge, L", quantity: 1, price: 4000, total: 4000, image: null, storeId: "s1" },
    ],
    pricing: {
      subtotal: 10000,
      deliveryFees: 1000,
      discount: 0,
      tax: 0,
      total: 10000,
      orderTotal: 11000,
      currency: "XOF",
      paymentStatus: "paid",
      paymentMethod: "Mobile Money",
    },
    // OrderTimelineProjection::buildForRole('vendor'): a new order of one
    // boutique, with its per-boutique steps still to come.
    canonical_timeline: [
      { key: "placed", label: "Commande reçue", status: "current", timestamp: "2026-10-08T09:30:00.000000Z", store_id: null, actor_type: null, description: "Commande créée, en attente de paiement" },
      { key: "vendor_confirmed", label: "Stock confirmé", status: "upcoming", timestamp: null, store_id: "s1", actor_type: null, description: null },
      { key: "collected", label: "Collecté", status: "upcoming", timestamp: null, store_id: "s1", actor_type: null, description: null },
      { key: "vendor_handoff", label: "Remise vendeur", status: "upcoming", timestamp: null, store_id: "s1", actor_type: null, description: null },
    ],
    cod_mixte: null,
    delivery: {
      method: null,
      address: {
        fullName: "Awa Traoré",
        phone: "+22670112233",
        line1: "Secteur 15, rue 15.42",
        line2: null,
        zone: "Patte d'Oie",
        city: "Ouagadougou",
        state: null,
        countryCode: "BF",
      },
      partner: null,
      shipmentStatus: null,
      courier: null,
      note: null,
    },
    actions: { confirm: true, cancel: true, requestDelivery: false, markShipped: false, markDelivered: false },
    ...overrides,
  };
}
