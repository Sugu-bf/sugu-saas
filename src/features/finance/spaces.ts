import type { EntryKind } from "./contract";
import type { FinanceProfile } from "./api";

// ============================================================
// The three money spaces. One set of screens: what changes from
// a vendor to an agency to a courier is where it lives and how
// it is worded, never what the figures are or where they come
// from.
// ============================================================

export interface FinanceSpace {
  profile: FinanceProfile;
  /** Root of the space: its overview. */
  base: string;
  home: { label: string; href: string };
  /** Title of the overview. */
  title: string;
  /** What `available` is called. */
  balanceLabel: string;
  /** What settlement credited, ever. */
  totalLabel: string;
  /** What settlement credited in the month. */
  monthLabel: string;
  chartTitle: string;
  /** One credit of settlement, counted: "vente", "livraison". */
  earningNoun: string;
  recentTitle: string;
  historyTitle: string;
  /** The kinds of entry this profile can have, in the order of the filter. */
  kinds: EntryKind[];
  /**
   * When money reaches the wallet. Funds still within the guarantee period
   * are in no wallet and have no figure: this sentence stands in their place,
   * rather than an estimate that a return or a dispute could prove wrong.
   */
  settlementNote: string;
  /** Whether cash is collected for others (`cash_held` of the summary). */
  holdsCash: boolean;
  /** Title of the tab of the browser, after the name of the screen. */
  site: string;
}

const paths = (base: string) => ({
  overview: base,
  history: `${base}/history`,
  withdrawals: `${base}/withdrawals`,
  withdraw: `${base}/withdraw`,
  methods: `${base}/methods`,
});

export const FINANCE_SPACES: Record<FinanceProfile, FinanceSpace> = {
  vendor: {
    profile: "vendor",
    base: "/vendor/wallet",
    home: { label: "Retour au tableau de bord", href: "/vendor/dashboard" },
    title: "Portefeuille",
    balanceLabel: "Solde disponible",
    totalLabel: "Total encaissé",
    monthLabel: "Ventes du mois",
    chartTitle: "Ventes encaissées",
    earningNoun: "vente",
    settlementNote: "Le montant d'une vente rejoint votre solde 72 heures après la livraison confirmée de la commande. D'ici là, il n'apparaît pas ici.",
    recentTitle: "Dernières opérations",
    historyTitle: "Historique",
    kinds: ["sale", "withdrawal", "withdrawal_released", "dispute", "adjustment"],
    holdsCash: false,
    site: "SUGUPro Vendeur",
  },
  agency: {
    profile: "agency",
    base: "/agency/earnings",
    home: { label: "Retour au tableau de bord", href: "/agency/dashboard" },
    title: "Finances de l'agence",
    balanceLabel: "Solde disponible",
    totalLabel: "Total des revenus",
    monthLabel: "Revenus de livraison",
    chartTitle: "Revenus de livraison",
    earningNoun: "livraison",
    settlementNote: "La part de l'agence rejoint son solde 72 heures après la remise du colis. D'ici là, elle n'apparaît pas ici.",
    recentTitle: "Activité récente",
    historyTitle: "Historique financier",
    kinds: ["delivery", "withdrawal", "withdrawal_released", "dispute", "adjustment"],
    holdsCash: true,
    site: "SUGUPro Agence",
  },
  courier: {
    profile: "courier",
    base: "/driver/earnings",
    home: { label: "Retour à l'accueil", href: "/driver/dashboard" },
    title: "Mes gains",
    balanceLabel: "Gains disponibles",
    totalLabel: "Total gagné",
    monthLabel: "Gains du mois",
    chartTitle: "Évolution des gains",
    earningNoun: "mission",
    settlementNote: "Votre part d'une mission rejoint vos gains 72 heures après la remise du colis. D'ici là, elle n'apparaît pas ici.",
    recentTitle: "Dernières opérations",
    historyTitle: "Historique des gains",
    kinds: ["delivery", "withdrawal", "withdrawal_released", "dispute", "adjustment"],
    holdsCash: true,
    site: "SUGUPro Coursier",
  },
};

export const financePaths = (space: FinanceSpace) => paths(space.base);
