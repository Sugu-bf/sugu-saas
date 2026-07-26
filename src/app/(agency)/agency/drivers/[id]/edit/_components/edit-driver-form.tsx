"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Loader2,
  Check,
  User,
  Bike,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  useDriverProfileData,
  useUpdateCourier,
  useVerifyCourierKyc,
} from "@/features/agency/hooks";

export function EditDriverForm({ courierId }: { courierId: string }) {
  const router = useRouter();
  const { data: driver, isLoading, isError } = useDriverProfileData(courierId);
  const updateMutation = useUpdateCourier();
  const verifyKycMutation = useVerifyCourierKyc();

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vehicleType, setVehicleType] = useState("motorcycle");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [status, setStatus] = useState<number>(1);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [prevDriverId, setPrevDriverId] = useState<string | null>(null);

  if (driver && driver.id !== prevDriverId) {
    setPrevDriverId(driver.id);
    const nameParts = (driver.fullName || driver.name || "").split(" ");
    setFirstName(nameParts[0] ?? "");
    setLastName(nameParts.slice(1).join(" ") ?? "");
    setEmail(driver.email === "—" ? "" : driver.email || "");
    setPhone(driver.phone || "");
    setAddress(driver.address === "—" ? "" : driver.address || "");
    const vStr = String(driver.vehicle || driver.vehicleType || "").toLowerCase();
    setVehicleType(
      vStr.includes("moto")
        ? "motorcycle"
        : vStr.includes("vél") || vStr.includes("vel")
          ? "bike"
          : vStr.includes("voit") || vStr.includes("car")
            ? "car"
            : "foot",
    );
    setVehicleMake(driver.vehicleMake === "—" ? "" : driver.vehicleMake || "");
    setVehiclePlate(driver.licensePlate || "");
    const emergencyParts = (driver.emergencyContact || "").split(" — ");
    setEmergencyContactName(emergencyParts[0] && emergencyParts[0] !== "—" ? emergencyParts[0] : "");
    setEmergencyContactPhone(emergencyParts[1] && emergencyParts[1] !== "—" ? emergencyParts[1] : "");
    setStatus(driver.status === "online" ? 1 : driver.status === "suspended" ? 2 : 4);
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        await updateMutation.mutateAsync({
          courierId,
          data: {
            first_name: firstName.trim() || undefined,
            last_name: lastName.trim() || undefined,
            email: email.trim() || undefined,
            phone_e164: phone.trim() || undefined,
            address: address.trim() || undefined,
            quartier: address.trim() || undefined,
            vehicle_type: vehicleType,
            vehicle_make: vehicleMake.trim() || undefined,
            vehicle_plate: vehiclePlate.trim() || undefined,
            emergency_contact_name: emergencyContactName.trim() || undefined,
            emergency_contact_phone: emergencyContactPhone.trim() || undefined,
            status,
            is_active: status === 1,
          },
        });

        toast.success("Livreur mis à jour avec succès !");
        router.push(`/agency/drivers/${courierId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
      }
    },
    [
      courierId,
      firstName,
      lastName,
      email,
      phone,
      address,
      vehicleType,
      vehicleMake,
      vehiclePlate,
      emergencyContactName,
      emergencyContactPhone,
      status,
      updateMutation,
      router,
    ],
  );

  const handleApproveKyc = async () => {
    try {
      await verifyKycMutation.mutateAsync({
        courierId,
        approved: true,
      });
      toast.success("Statut KYC approuvé avec succès !");
    } catch {
      toast.error("Erreur lors de l'approbation KYC");
    }
  };

  const handleRejectKyc = async () => {
    if (!rejectReason.trim()) {
      toast.error("Veuillez indiquer un motif de rejet du KYC.");
      return;
    }

    try {
      await verifyKycMutation.mutateAsync({
        courierId,
        approved: false,
        notes: rejectReason.trim(),
      });
      toast.success("Statut KYC rejeté.");
      setShowRejectInput(false);
      setRejectReason("");
    } catch {
      toast.error("Erreur lors du rejet du KYC");
    }
  };

  if (isLoading || !driver) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sugu-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-gray-500">Erreur lors du chargement des données du livreur.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/agency/drivers" className="text-gray-500 hover:text-sugu-500">
          Livreurs
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        <Link href={`/agency/drivers/${courierId}`} className="text-gray-500 hover:text-sugu-500">
          {driver.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        <span className="font-medium text-gray-900 dark:text-white">Modifier</span>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white lg:text-2xl">
            Modifier {driver.name}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Mettez à jour le profil du livreur, les informations du véhicule et le statut KYC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/agency/drivers/${courierId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Annuler
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sugu-600 disabled:opacity-60"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Enregistrer les modifications
          </button>
        </div>
      </div>

      {/* Main Form Sections (2 Columns) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column — Personal & Vehicle Information */}
        <div className="space-y-6 lg:col-span-7">
          {/* Personal Info Card */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
              <User className="h-4.5 w-4.5 text-sugu-500" />
              Informations personnelles
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom du livreur"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom de famille"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Téléphone (E.164)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+226XXXXXXXX"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Adresse / Quartier
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quartier, Ville ou adresse complète"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Contact d&apos;urgence (Nom)
                </label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Nom de la personne à contacter"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Contact d&apos;urgence (Téléphone)
                </label>
                <input
                  type="text"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="+226XXXXXXXX"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Info Card */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
              <Bike className="h-4.5 w-4.5 text-sugu-500" />
              Informations du véhicule
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Type de véhicule
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="motorcycle">Moto</option>
                  <option value="bike">Vélo</option>
                  <option value="car">Voiture</option>
                  <option value="foot">À pied / Tricycle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Modèle / Marque
                </label>
                <input
                  type="text"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  placeholder="ex: Yamaha 125, Toyota"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Plaque d&apos;immatriculation
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="ex: BG-155-DM"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sugu-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — KYC Status & Account Status */}
        <div className="space-y-6 lg:col-span-5">
          {/* KYC Status & Management Card */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
              <ShieldCheck className="h-4.5 w-4.5 text-sugu-500" />
              Statut KYC &amp; Validation
            </h2>

            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Statut KYC actuel</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    driver.documentsStatus.includes("vérifiés") || driver.status === "online"
                      ? "bg-green-50 text-green-600 dark:bg-green-950/30"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
                  )}
                >
                  {driver.documentsStatus.includes("vérifiés") ? "KYC Vérifié" : driver.documentsStatus}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleApproveKyc}
                  disabled={verifyKycMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-600 disabled:opacity-50"
                >
                  {verifyKycMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Approuver la vérification KYC
                </button>

                {!showRejectInput ? (
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                  >
                    <XCircle className="h-4 w-4" />
                    Rejeter le KYC
                  </button>
                ) : (
                  <div className="mt-2 space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                    <label className="block text-xs font-semibold text-red-700 dark:text-red-400">
                      Motif du rejet :
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Indiquez la raison du rejet des documents..."
                      rows={2}
                      className="w-full rounded-lg border border-red-200 bg-white p-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none dark:border-red-900 dark:bg-gray-900 dark:text-white"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(false)}
                        className="px-3 py-1 text-xs font-semibold text-gray-600 hover:text-gray-800"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectKyc}
                        disabled={verifyKycMutation.isPending}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirmer le rejet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Documents List */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-gray-900 dark:text-white">Documents joints</p>
              {driver.documents.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun document téléversé.</p>
              ) : (
                driver.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-white/60 p-2.5 text-xs dark:border-gray-800 dark:bg-gray-900/30"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">{doc.label}</span>
                    </div>
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sugu-600 hover:text-sugu-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Account Status Card */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
              <ShieldAlert className="h-4.5 w-4.5 text-sugu-500" />
              Statut du compte
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                État du compte livreur
              </label>
              <div className="space-y-2">
                {[
                  { value: 1, label: "Actif / En service", desc: "Le livreur peut recevoir et effectuer des livraisons" },
                  { value: 4, label: "En attente KYC", desc: "En attente de vérification des documents" },
                  { value: 2, label: "Suspendu", desc: "Compte temporairement bloqué" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all",
                      status === opt.value
                        ? "border-sugu-500 bg-sugu-50/40 dark:border-sugu-500 dark:bg-sugu-950/20"
                        : "border-gray-100 bg-white hover:bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/30",
                    )}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={status === opt.value}
                      onChange={() => setStatus(opt.value)}
                      className="mt-0.5 text-sugu-500 focus:ring-sugu-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{opt.label}</p>
                      <p className="text-[11px] text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
