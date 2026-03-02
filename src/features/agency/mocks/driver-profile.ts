import type { DriverProfile } from "../schema";

// ============================================================
// Agency Driver Profile — Mock Data (Design-Only)
// ============================================================

export const mockDriverProfile: DriverProfile = {
  id: "drv-01",
  name: "Ibrahim Konaté",
  initials: "IK",
  avatarColor: "bg-amber-100 text-amber-700",
  avatarUrl: null,
  rank: 1,
  status: "online",
  statusSince: "En service depuis 6h30",
  vehicle: "moto",

  // Hero KPIs
  totalDeliveries: 847,
  monthDeliveries: 124,
  successRate: 98,
  rating: 4.9,
  totalReviews: 312,
  avgDeliveryTime: "2h 15min",
  avgTimeTarget: "< 3h",
  monthRevenue: "485,200 FCFA",
  seniority: "8 mois",
  seniorityDetail: "since June 2025",

  // Personal info
  fullName: "Ibrahim Konaté",
  phone: "+223 65 23 45 67",
  email: "ibrahim@gmail.com",
  dateOfBirth: "18 Juin 1983",
  address: "ACI 2000, Bamako",
  emergencyContact: "",
  joinedDate: "19 Juin 2025",
  addedBy: "Ibrahim Ronaté",

  // Vehicle & documents
  vehicleType: "Moto",
  vehicleMake: "Yamaha YBR 125",
  licensePlate: "",
  documents: [
    { id: "doc-1", label: "Identity", value: "Verified", status: "verified" },
    { id: "doc-2", label: "License", value: "Category A2", status: "verified" },
    { id: "doc-3", label: "Insurance", value: "Expires soon", status: "expires_soon" },
    { id: "doc-4", label: "Vehicle Registration", value: "Verified", status: "verified" },
  ],
  documentsStatus: "Overall status messages sont is verified.",

  // Performance chart (hourly bars)
  perfBars: [
    { hour: "08", value: 20 },
    { hour: "09", value: 40 },
    { hour: "10", value: 35 },
    { hour: "12", value: 55 },
    { hour: "13", value: 70 },
    { hour: "14", value: 95 },
    { hour: "hou", value: 60 },
    { hour: "17", value: 45 },
    { hour: "18", value: 80 },
    { hour: "19", value: 65 },
    { hour: "20", value: 50 },
    { hour: "21", value: 30 },
    { hour: "22", value: 15 },
  ],
  perfDeliveries: 842,
  perfVsLastMonth: "vs lerest imst moth",
  perfVsTeamAvg: "+33%",
  perfRank: "1st",

  // Revenue breakdown
  revTotal: "485,200 FCFA",
  revFees: "485,200 FCFA",
  revBonus: "85,200 FCFA",
  revTips: "7,200 FCFA",
  revPaid: "485,200 FCFA",
  revPending: "36,500 FCFA",
  revNextPayment: "10 juin 2025",

  // Reviews
  reviewAvg: 4.9,
  reviewDistribution: [
    { stars: 5, count: 240 },
    { stars: 4, count: 50 },
    { stars: 3, count: 15 },
    { stars: 2, count: 5 },
    { stars: 1, count: 2 },
  ],
  recentReviews: [
    { id: "rev-1", rating: 5, name: "Name 1", timeAgo: "3 hours ago" },
    { id: "rev-2", rating: 5, name: "Name 2", timeAgo: "3 hours ago" },
    { id: "rev-3", rating: 5, name: "Liera 3", timeAgo: "3 hours ago" },
  ],

  // Recent deliveries table
  recentDeliveriesTable: [
    { id: "del-1", orderId: "0002000", dotColor: "bg-green-500", route: "Route 1", amount: "41,200 FCFA", time: "08:30", duration: "14 mon" },
    { id: "del-2", orderId: "0002071", dotColor: "bg-red-500", route: "Route 2", amount: "3,500 FCFA", time: "08:35", duration: "16 mon" },
    { id: "del-3", orderId: "0002022", dotColor: "bg-amber-500", route: "Route 3", amount: "17,000 FCFA", time: "08:89", duration: "27 mon" },
    { id: "del-4", orderId: "0002023", dotColor: "bg-green-500", route: "Route 4", amount: "11,900 FCFA", time: "15:15", duration: "21 mon" },
    { id: "del-5", orderId: "0002055", dotColor: "bg-green-500", route: "Route 5", amount: "3,800 FCFA", time: "08:35", duration: "21 mon" },
    { id: "del-6", orderId: "0003088", dotColor: "bg-green-500", route: "Route 6", amount: "3,600 FCFA", time: "05:34", duration: "18 mon" },
    { id: "del-7", orderId: "0003057", dotColor: "bg-green-500", route: "Route 7", amount: "1,500 FCFA", time: "08:35", duration: "15 mon" },
    { id: "del-8", orderId: "0003028", dotColor: "bg-green-500", route: "Route 8", amount: "1,500 FCFA", time: "15:38", duration: "15 mon" },
  ],
  tableTodayTotal: "485,200 FCFA",
  tableTodayCount: 367,
  tableAvgPerTeam: 367,
  tableRank: 3,

  // Incidents
  incidentCount: 2,
  incidentRate: 2,
  incidents: [
    {
      id: "inc-1",
      title: "Délais en 2 encanaire",
      description:
        "Livraire sa resemucur contumo performance à livraison",
      orderId: "Cordemndre # 00023 - 15:43",
      time: "",
    },
    {
      id: "inc-2",
      title: "Livraison commoine failed",
      description: "",
      orderId: "Cordemndre # 00025 - 12:43",
      time: "",
    },
  ],

  // Footer
  membershipSince: "Memberships depuis 6h 6h30",
};
