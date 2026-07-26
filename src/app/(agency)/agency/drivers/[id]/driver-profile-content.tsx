"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Star,
  Truck,
  CheckCircle2,
  Bike,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Pencil,
  Ban,
  UserMinus,
  Calendar,
  Loader2,
  Eye,
  PlayCircle,
  User,
  XCircle,
} from "lucide-react";
import {
  useDriverProfileData,
  useSuspendCourier,
  useActivateCourier,
  useRemoveCourier,
  useVerifyCourierKyc,
} from "@/features/agency/hooks";

const STATUS_CFG = {
  online: { label: "En ligne", dot: "bg-green-500", text: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  offline: { label: "Hors ligne", dot: "bg-gray-400", text: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  suspended: { label: "Suspendu", dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
};

const DOC_STATUS_ICON = {
  verified: <ShieldCheck className="h-4 w-4 text-green-500" />,
  pending: <Shield className="h-4 w-4 text-amber-500" />,
  expires_soon: <ShieldAlert className="h-4 w-4 text-amber-500" />,
  expired: <ShieldAlert className="h-4 w-4 text-red-500" />,
};

const DOC_STATUS_LABEL_CLR = {
  verified: "text-green-600 bg-green-50 dark:bg-green-950/30",
  pending: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  expires_soon: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  expired: "text-red-600 bg-red-50 dark:bg-red-950/30",
};

export function DriverProfileContent({ courierId }: { courierId: string }) {
  const router = useRouter();
  const { data, isLoading, isError } = useDriverProfileData(courierId);
  const suspendMutation = useSuspendCourier();
  const activateMutation = useActivateCourier();
  const removeMutation = useRemoveCourier();
  const verifyMutation = useVerifyCourierKyc();

  if (isLoading || !data) {
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
        <p className="text-sm text-gray-500">Erreur lors du chargement du profil.</p>
      </div>
    );
  }

  const sCfg = STATUS_CFG[data.status] ?? STATUS_CFG.offline;

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/agency/drivers"
            className="flex items-center gap-1.5 text-sm font-semibold text-sugu-500 hover:text-sugu-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux livreurs
          </Link>
          <div className="hidden sm:block h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <h1 className="hidden sm:block text-lg font-bold text-gray-900 dark:text-white">
            {data.name}
          </h1>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", sCfg.bg, sCfg.text)}>
            <span className={cn("h-2 w-2 rounded-full", sCfg.dot)} />
            {sCfg.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Bike className="h-3 w-3" />
            {data.vehicleType || "Moto"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/agency/drivers/${data.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Link>
          {data.status === "suspended" ? (
            <button
              onClick={() => activateMutation.mutate({ courierId: data.id })}
              disabled={activateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400 disabled:opacity-50"
            >
              {activateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
              Réactiver
            </button>
          ) : (
            <button
              onClick={() => suspendMutation.mutate({ courierId: data.id })}
              disabled={suspendMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 disabled:opacity-50"
            >
              {suspendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
              Suspendre
            </button>
          )}

          <button
            onClick={() => {
              if (confirm("Êtes-vous sûr de vouloir retirer ce livreur de votre agence ?")) {
                removeMutation.mutate({ courierId: data.id }, { onSuccess: () => router.push("/agency/drivers") });
              }
            }}
            disabled={removeMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-50"
          >
            {removeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
            Retirer
          </button>
        </div>
      </header>

      {/* Hero Card + Key Metrics */}
      <section className="glass-card animate-card-enter rounded-2xl p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          {/* Avatar + Quick Info */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div
                className={cn(
                  "flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold ring-4 ring-white shadow-md dark:ring-gray-900",
                  data.avatarColor,
                )}
              >
                {data.initials}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.name}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <span className={cn("h-2 w-2 rounded-full", sCfg.dot)} />
                {data.statusSince}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { const phone = data.phone.replace(/\s/g, ""); window.open(`tel:${phone}`); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <Phone className="h-3.5 w-3.5 text-sugu-500" />
                  Appeler
                </button>
                <button
                  onClick={() => { const phone = data.phone.replace(/[\s+]/g, ""); window.open(`https://wa.me/${phone}`); }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 shadow-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* Real Metrics Grid */}
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Total livraisons */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Truck className="h-3.5 w-3.5 text-sugu-500" />
                Total livraisons
              </div>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                {data.totalDeliveries}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Livraisons effectuées</p>
            </div>

            {/* Taux de réussite */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Taux de réussite
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {data.successRate}%
                </p>
                <div className="relative h-7 w-7">
                  <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200/60 dark:text-gray-700/40" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${data.successRate}, 100`} strokeLinecap="round" className="text-green-500" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Note client */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                Note clients
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {data.rating}
                </p>
                <span className="text-xs text-gray-400">/ 5</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{data.totalReviews} avis enregistrés</p>
            </div>

            {/* Ancienneté */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                Ancienneté
              </div>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                {data.seniority}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{data.seniorityDetail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Main Content Section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column — Personal Information */}
        <section className="glass-card animate-card-enter rounded-2xl p-6 lg:col-span-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            <User className="h-4 w-4 text-sugu-500" />
            Informations personnelles
          </h3>
          <dl className="space-y-3">
            {[
              { dt: "Nom complet", dd: data.fullName },
              { dt: "Téléphone", dd: data.phone },
              { dt: "Email", dd: data.email },
              { dt: "Date de naissance", dd: data.dateOfBirth },
              { dt: "Adresse / Quartier", dd: data.address },
              { dt: "Contact d'urgence", dd: data.emergencyContact },
              { dt: "Date d'embauche", dd: data.joinedDate },
            ].map((item) => (
              <div key={item.dt} className="flex items-center justify-between gap-3 text-xs py-1 border-b border-gray-50/50 dark:border-gray-800/30">
                <dt className="text-gray-500 dark:text-gray-400 font-medium">{item.dt}</dt>
                <dd className="font-semibold text-gray-900 dark:text-white text-right">
                  {item.dd}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Right Column — Vehicle & KYC Documents */}
        <section className="glass-card animate-card-enter rounded-2xl p-6 lg:col-span-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            <Bike className="h-4 w-4 text-sugu-500" />
            Véhicule &amp; Documents KYC
          </h3>

          <dl className="space-y-3 mb-6">
            {[
              { dt: "Type de véhicule", dd: data.vehicleType },
              { dt: "Modèle / Couleur", dd: data.vehicleMake },
              { dt: "Plaque d'immatriculation", dd: data.licensePlate || "—" },
            ].map((item) => (
              <div key={item.dt} className="flex items-center justify-between gap-3 text-xs py-1 border-b border-gray-50/50 dark:border-gray-800/30">
                <dt className="text-gray-500 dark:text-gray-400 font-medium">{item.dt}</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">{item.dd}</dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-900 dark:text-white">Documents enregistrés</p>
            <span className="text-xs text-gray-400 italic">{data.documentsStatus}</span>
          </div>

          <div className="space-y-2.5">
            {data.documents.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Aucun document téléversé pour le moment.</p>
            ) : (
              data.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white/50 p-3 dark:border-gray-800 dark:bg-gray-900/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {DOC_STATUS_ICON[doc.status]}
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{doc.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-sugu-600 hover:text-sugu-700"
                        title="Consulter le fichier"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir
                      </a>
                    )}
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold", DOC_STATUS_LABEL_CLR[doc.status])}>
                      {doc.value}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {(data.status === "suspended" || data.documents.some((d) => d.status === "pending")) && (
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  if (confirm("Voulez-vous approuver la vérification KYC de ce livreur ?")) {
                    verifyMutation.mutate({ courierId: data.id, approved: true });
                  }
                }}
                disabled={verifyMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-600 disabled:opacity-50"
              >
                {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Approuver KYC
              </button>
              <button
                onClick={() => {
                  const reason = prompt("Raison du rejet du KYC :");
                  if (reason !== null) {
                    verifyMutation.mutate({ courierId: data.id, approved: false, notes: reason });
                  }
                }}
                disabled={verifyMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-50"
              >
                {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Rejeter KYC
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
