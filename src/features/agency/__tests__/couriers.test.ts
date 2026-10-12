import { describe, expect, it } from "vitest";
import { documentLabel, parseCourier, parseCourierDetail, parseCourierListPage, vehicleFormValue, vehicleLabel } from "../couriers/contract";
import { COURIER_FIELDS, EMPTY_COURIER_FORM, courierFormOf, registerRequestOf, updateRequestOf, validateCourierForm, type CourierForm } from "../couriers/courier-form";
import { parseAgencyDashboard } from "../dashboard/contract";
import { rawCourier, rawCourierOverview, rawOverview, rawRow } from "./fixtures";

describe("courier", () => {
  it("reads the record, the figures of the day in francs, and what is kept in metadata", () => {
    const courier = parseCourier(rawCourier());
    expect(courier).toMatchObject({
      id: "courier-profile-1",
      userId: "user-1",
      name: "Moussa Kaboré",
      phone: "+226 70 10 20 30",
      activity: "on_delivery",
      deliveriesToday: 3,
      revenueTodayFrancs: 5500,
      successRate: 96.9,
      quartier: "Gounghin",
      vehicleMake: "Yamaha YBR 125",
      vehicleYear: "2022",
    });
    expect(courier.documents).toEqual([{ id: "d1", type: "id_card", number: "B 1000000", expiresOn: "2029-01-01", status: "1", file: "none" }]);
  });

  // Found on staging (V3.1): « Voir le fichier » opened a signed link to the host of the API.
  it("knows whether a document has a file, whether it is still on the server, and keeps nothing of the signed link of the API", () => {
    const signed = "https://api.example.test/api/v1/kyc-files/courier/f1?expires=1791789219&signature=abc";
    const courier = parseCourier(rawCourier({ kyc_documents: [{ id: "d1", document_type: "id_card", status: 1, file_url: signed }, { id: "d2", document_type: "driver_license", status: 0, file_url: null }, { id: "d3", document_type: "insurance", status: 0, file_url: signed, file_available: false }, { id: "d4", document_type: "other", status: 0, file_url: signed, file_available: true }] }));

    // d1: a backend that does not say whether the file is still there; d3: sent, and lost by the server since.
    expect(courier.documents?.map((document) => [document.id, document.file])).toEqual([["d1", "available"], ["d2", "none"], ["d3", "missing"], ["d4", "available"]]);
    expect(JSON.stringify(courier)).not.toContain("api.example.test");
  });

  it("never shows the made-up address of a courier registered without an e-mail", () => {
    const courier = parseCourier(rawCourier({ user: { id: "user-1", name: "Awa Ilboudo", email: "awa.x7Kp2mQz@courier.sugu.pro", phone_e164: null } }));
    expect(courier.email).toBeNull();
    // Without a phone on the account, the one of the profile is used.
    expect(courier.phone).toBe("+22670102030");
  });

  it("knows a rate that does not exist yet from a rate of zero, and documents withheld from documents absent", () => {
    const fresh = parseCourier(rawCourier({ success_rate: null, total_deliveries: 0, completed_deliveries: 0, kyc_documents: undefined, activity: undefined }));
    expect(fresh.successRate).toBeNull();
    expect(fresh.documents).toBeNull();
    expect(fresh.activity).toBeNull();
    expect(parseCourier(rawCourier({ kyc_documents: [] })).documents).toEqual([]);
  });

  it("names a vehicle whichever way the backend stored it", () => {
    expect([vehicleLabel("moto"), vehicleLabel("motorcycle"), vehicleLabel("bike"), vehicleLabel("tricycle"), vehicleLabel("foot"), vehicleLabel("drone"), vehicleLabel(null)]).toEqual([
      "Moto",
      "Moto",
      "Vélo",
      "Tricycle",
      "À pied",
      "drone",
      null,
    ]);
    expect([vehicleFormValue("motorcycle"), vehicleFormValue("car"), vehicleFormValue("velo"), vehicleFormValue("foot"), vehicleFormValue(null)]).toEqual(["moto", "voiture", "velo", "", ""]);
    expect(documentLabel("driver_license")).toBe("Permis de conduire");
    expect(documentLabel("unknown_type")).toBe("Document");
  });
});

describe("courier list", () => {
  const alerts = {
    documents: { total: 4, items: [{ courier_id: "c5", name: "Salif Compaoré", employee_id: "LV-005", document_type: "driver_license", expires_on: "2026-10-08", days_left: -3 }] },
    lowPerformance: { total: 1, items: [{ courier_id: "c7", name: "Awa Ilboudo", employee_id: "LV-007", success_rate: 72.9, total_deliveries: 96 }] },
    inactive: { total: 0, items: [] },
  };
  const payload = { couriers: [rawCourier()], overview: rawCourierOverview, quartiers: [{ name: "Gounghin", count: 2 }], alerts, pagination: { total: 8 } };

  it("reads the counters, the quartiers and the three lists of alerts with the total each was cut from", () => {
    const page = parseCourierListPage(payload, { page: 1, pageSize: 10 });
    expect(page).toMatchObject({ total: 8, overview: rawCourierOverview, quartiers: [{ name: "Gounghin", count: 2 }] });
    expect(page.alerts?.documents).toEqual({ total: 4, items: [{ courierId: "c5", name: "Salif Compaoré", employeeId: "LV-005", documentType: "driver_license", expiresOn: "2026-10-08", daysLeft: -3 }] });
    expect(page.alerts?.lowPerformance.items[0]).toMatchObject({ successRate: 72.9, totalDeliveries: 96 });
  });

  it("has no alerts for who does not run the agency, and none invented on an older backend", () => {
    expect(parseCourierListPage({ ...payload, alerts: null }, { page: 1, pageSize: 10 }).alerts).toBeNull();
    const old = parseCourierListPage({ couriers: [], pagination: { total: 0 } }, { page: 1, pageSize: 10 });
    expect(old).toMatchObject({ overview: null, quartiers: null, alerts: null, rows: [] });
  });
});

describe("courier page", () => {
  const activity = {
    last_position: { lat: 12.3657, lng: -1.5339, recorded_at: "2026-10-11T15:57:00+00:00", shipment_id: "s1" },
    current_mission: rawRow(),
    recent_deliveries: [rawRow(), rawRow({ id: "s2", status: "delivered" })],
    performance: { average_delivery_minutes: 36, revenue_total: 101880000, revenue_this_month: 750000, revenue_last_month: 500000, deliveries_this_month: 3, deliveries_last_month: 2 },
    earnings: { commission_rate: 75, rate_is_own: true, this_month: { revenue: 750000, courier_share: 562500, agency_share: 187500 }, last_month: { revenue: 500000, courier_share: 375000, agency_share: 125000 } },
    rhythm: { window_days: 30, deliveries_by_weekday: [0, 0, 0, 0, 0, 2, 1], first_hour: 14, last_hour: 15 },
    today_events: [{ at: "2026-10-11T15:40:00+00:00", event_type: "status_updated", status: "delivered", memo: null, shipment_id: "s2", order_number: "SU-2026-000041" }],
  };

  it("reads the mission, the shares of the month in francs, the rhythm and the day", () => {
    const detail = parseCourierDetail({ courier: rawCourier(), stats: {}, activity });
    expect(detail.activity).toMatchObject({
      averageDeliveryMinutes: 36,
      revenueTotalFrancs: 1018800,
      deliveriesThisMonth: 3,
      earnings: { commissionRate: 75, rateIsOwn: true, thisMonth: { revenueFrancs: 7500, courierShareFrancs: 5625, agencyShareFrancs: 1875 } },
      rhythm: { windowDays: 30, byWeekday: [0, 0, 0, 0, 0, 2, 1], firstHour: 14, lastHour: 15 },
      lastPosition: { lat: 12.3657, lng: -1.5339, recordedAt: "2026-10-11T15:57:00+00:00" },
    });
    expect(detail.activity?.mission?.reference).toBe("SU-2026-000042");
    expect(detail.activity?.recentDeliveries).toHaveLength(2);
    expect(detail.activity?.todayEvents).toEqual([{ at: "2026-10-11T15:40:00+00:00", type: "status_updated", status: "delivered", memo: null, deliveryId: "s2", reference: "SU-2026-000041" }]);
  });

  it("shows the record alone on a backend that answers no activity", () => {
    const detail = parseCourierDetail({ courier: rawCourier(), stats: {} });
    expect(detail.activity).toBeNull();
    expect(detail.courier.name).toBe("Moussa Kaboré");
  });

  it("has no mission, position, shares or rhythm when the backend has none, rather than empty ones", () => {
    const detail = parseCourierDetail({ courier: rawCourier(), activity: { ...activity, last_position: null, current_mission: null, earnings: undefined, rhythm: undefined, performance: { ...activity.performance, average_delivery_minutes: null } } });
    expect(detail.activity).toMatchObject({ lastPosition: null, mission: null, earnings: null, rhythm: null, averageDeliveryMinutes: null });
  });
});

describe("courier form", () => {
  const filled: CourierForm = { ...EMPTY_COURIER_FORM, firstName: "Moussa", lastName: "Kaboré", phone: "+226 70 10 20 30", vehicleType: "moto" };
  const now = new Date("2026-10-11T12:00:00");

  it("asks, to register, for a name, a phone and a vehicle", () => {
    expect(Object.keys(validateCourierForm(EMPTY_COURIER_FORM, "register", undefined, now))).toEqual(["firstName", "lastName", "phone", "vehicleType"]);
    expect(validateCourierForm(filled, "register", undefined, now)).toEqual({});
    expect(Object.keys(validateCourierForm(EMPTY_COURIER_FORM, "register", "vehicle", now))).toEqual(["vehicleType"]);
    for (const field of Object.keys(validateCourierForm(EMPTY_COURIER_FORM, "register", undefined, now))) expect(COURIER_FIELDS[field as keyof CourierForm]).toBeDefined();
  });

  it("refuses a courier under sixteen, a year that is not one, and an invitation without an address", () => {
    expect(validateCourierForm({ ...filled, dateOfBirth: "2012-01-01" }, "register", undefined, now)).toEqual({ dateOfBirth: "Un livreur doit avoir au moins 16 ans." });
    expect(validateCourierForm({ ...filled, dateOfBirth: "2010-10-11" }, "register", undefined, now)).toEqual({});
    expect(validateCourierForm({ ...filled, vehicleYear: "22" }, "register", undefined, now).vehicleYear).toBeDefined();
    expect(validateCourierForm({ ...filled, sendInvitation: true }, "register", undefined, now).sendInvitation).toBeDefined();
    expect(validateCourierForm({ ...filled, sendInvitation: true, email: "moussa@example.test" }, "register", undefined, now)).toEqual({});
  });

  it("registers with an invitation only when there is an address to send it to, and never claims an SMS", () => {
    expect(registerRequestOf({ ...filled, email: " moussa@example.test ", sendInvitation: true, quartier: " Gounghin " })).toMatchObject({
      first_name: "Moussa",
      last_name: "Kaboré",
      phone: "+226 70 10 20 30",
      email: "moussa@example.test",
      quartier: "Gounghin",
      vehicle_type: "moto",
      send_email: true,
      send_sms: false,
    });
    expect(registerRequestOf({ ...filled, sendInvitation: true })).toMatchObject({ email: undefined, send_email: false });
  });

  it("starts an edit from the record, and lets a courier known by one name keep it", () => {
    const form = courierFormOf(parseCourier(rawCourier({ vehicle_type: "motorcycle" })));
    expect(form).toMatchObject({ firstName: "Moussa", lastName: "Kaboré", phone: "+226 70 10 20 30", email: "moussa@example.test", quartier: "Gounghin", vehicleType: "moto", vehicleMake: "Yamaha YBR 125" });

    const single = courierFormOf(parseCourier(rawCourier({ user: { id: "user-1", name: "Moussa", email: null, phone_e164: "+226 70 10 20 30" } })));
    expect(single).toMatchObject({ firstName: "Moussa", lastName: "" });
    expect(validateCourierForm(single, "edit", undefined, now)).toEqual({});
    expect(updateRequestOf(single).last_name).toBeUndefined();
    // His first name and his name, as the server kept them: a compound first name stays whole.
    const typed = rawCourier({ first_name: "Jean Baptiste", last_name: "Nikiéma", user: { id: "u", name: "Jean Baptiste Nikiéma", email: null, phone_e164: null } });
    expect(courierFormOf(parseCourier(typed))).toMatchObject({ firstName: "Jean Baptiste", lastName: "Nikiéma" });
    // A backend that answers the whole name only: the first word is the first name, the rest the name.
    expect(courierFormOf(parseCourier(rawCourier({ user: { id: "u", name: "Jean Baptiste Nikiéma", email: null, phone_e164: null } })))).toMatchObject({ firstName: "Jean", lastName: "Baptiste Nikiéma" });
  });

  it("sends an emptied field as empty, so that the server removes it", () => {
    const request = updateRequestOf({ ...filled, vehicleColor: "", quartier: "  ", vehiclePlate: " 11 KK 4521 " });
    expect(request).toMatchObject({ first_name: "Moussa", last_name: "Kaboré", vehicle_color: "", quartier: "", vehicle_plate: "11 KK 4521", vehicle_type: "moto" });
  });
});

describe("dashboard", () => {
  it("reads the day in francs, the pressing deliveries with their total, and who is on the road", () => {
    const dashboard = parseAgencyDashboard({
      agencyName: "Faso Express",
      overview: rawOverview,
      today: { created: 29, createdYesterday: 5, delivered: 6, deliveredYesterday: 3, failed: 2, failedYesterday: 1, revenue: 1550000, revenueYesterday: 750000 },
      priority: { total: 13, shipments: [rawRow({ priority_reason: "late", late: true })] },
      activityByHour: Array.from({ length: 24 }, (_, hour) => ({ hour, delivered: hour === 15 ? 2 : 0, failed: 0 })),
      couriers: {
        overview: rawCourierOverview,
        live: [{ courier_id: "c1", user_id: "u1", name: "Moussa Kaboré", phone: null, activity: "on_delivery", last_activity_at: "2026-10-11T15:57:00+00:00", shipment: { id: "s1", order_number: "SU-1", status: "in_transit", zone: null, address: "Rue 12, Ouagadougou" } }],
      },
    });
    expect(dashboard.today).toMatchObject({ delivered: 6, revenueFrancs: 15500, revenueYesterdayFrancs: 7500 });
    expect(dashboard.priority.total).toBe(13);
    expect(dashboard.priority.rows[0]).toMatchObject({ priorityReason: "late", late: true });
    expect(dashboard.activityByHour).toHaveLength(24);
    // Without a zone, the address says where the courier is heading.
    expect(dashboard.couriers.live[0].delivery).toEqual({ id: "s1", reference: "SU-1", status: "in_transit", place: "Rue 12, Ouagadougou" });
  });

  it("refuses the payload of a backend older than the portal contract instead of drawing zeros", () => {
    expect(() => parseAgencyDashboard({ agencyName: "Faso Express", kpis: { deliveriesToday: 4 } })).toThrow();
  });
});
