"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Bell,
  ChevronDown,
  Download,
  LayoutGrid,
  List,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  ShoppingCart,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Card,
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  EmptyState,
  ErrorState,
  FormField,
  IconButton,
  Input,
  Money,
  PageHeader,
  Pagination,
  Section,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  Skeleton,
  Stat,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  formatMoneyFromCents,
  formatMoneyFromFrancs,
  statusRegistries,
  type StatusDomain,
} from "@/design-system";
import { SaleFormDemo, StepperDemo } from "./gallery-forms";
import { OrdersTableDemo, PhoneListDemo } from "./gallery-table";

function demoOnly(action: string) {
  toast.info(`${action} : démonstration, aucune requête envoyée.`);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-meta font-medium text-foreground-subtle">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const SWATCHES: Array<{ name: string; className: string }> = [
  { name: "background", className: "bg-background" },
  { name: "surface", className: "bg-surface" },
  { name: "surface-subtle", className: "bg-surface-subtle" },
  { name: "surface-hover", className: "bg-surface-hover" },
  { name: "border", className: "bg-border" },
  { name: "border-strong", className: "bg-border-strong" },
  { name: "border-control", className: "bg-border-control" },
  { name: "foreground-subtle", className: "bg-foreground-subtle" },
  { name: "foreground-muted", className: "bg-foreground-muted" },
  { name: "foreground", className: "bg-foreground" },
  { name: "brand", className: "bg-brand" },
  { name: "primary", className: "bg-primary" },
  { name: "primary-hover", className: "bg-primary-hover" },
  { name: "brand-subtle", className: "bg-brand-subtle" },
];

const TYPE_SCALE: Array<{ name: string; className: string; sample: string }> = [
  { name: "page-title · 22/28 · 600", className: "text-page-title", sample: "Commandes" },
  { name: "section-title · 16/24 · 600", className: "text-section-title", sample: "Commandes récentes" },
  { name: "body · 14/20", className: "text-body", sample: "Le coursier a collecté le colis à 14 h 05." },
  { name: "label · 13/18 · 500", className: "text-label", sample: "Adresse de livraison" },
  { name: "meta · 12/16", className: "text-meta text-foreground-muted", sample: "Mis à jour il y a 3 min" },
  { name: "kpi · 24/32 · 600 · tabulaire", className: "text-kpi tabular-nums", sample: "1 250 000 FCFA" },
];

const STATUS_DOMAINS: Array<{ domain: StatusDomain; title: string }> = [
  { domain: "order", title: "Commande" },
  { domain: "orderPayment", title: "Paiement d'une commande" },
  { domain: "payment", title: "Transaction de paiement" },
  { domain: "delivery", title: "Livraison (agence et coursier)" },
  { domain: "product", title: "Produit" },
  { domain: "stock", title: "Stock" },
  { domain: "payout", title: "Versement" },
  { domain: "kycDocument", title: "KYC · document" },
  { domain: "kycRequest", title: "KYC · demande" },
  { domain: "courier", title: "Compte coursier" },
  { domain: "suguBoxInbound", title: "Sugu Box · réception" },
  { domain: "suguBoxOutbound", title: "Sugu Box · expédition" },
  { domain: "suguBoxListing", title: "Sugu Box · annonce" },
];

const NAV = [
  ["fondations", "Fondations"],
  ["boutons", "Boutons"],
  ["statuts", "Statuts"],
  ["kpi", "KPI"],
  ["retours", "Retours"],
  ["formulaires", "Formulaires"],
  ["table", "Table"],
  ["telephone", "Liste téléphone"],
  ["navigation", "Navigation"],
  ["overlays", "Overlays"],
  ["argent", "Argent"],
] as const;

export function Gallery() {
  const [view, setView] = useState<"list" | "grid">("list");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [page, setPage] = useState(3);

  return (
    <div className="sugu-ui min-h-screen bg-background">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-page py-page">
        <PageHeader
          breadcrumbs={[{ label: "Développement", href: "/dev/ui" }, { label: "Design system" }]}
          title="Design system SUGU Pro"
          description="Galerie de développement : tokens, primitives et états. Données synthétiques, aucune requête métier."
          titleAddon={<Badge tone="info">Phase A</Badge>}
          primaryAction={{ label: "Nouvelle vente", icon: Plus, onSelect: () => demoOnly("Nouvelle vente") }}
          secondaryActions={[
            { label: "Exporter", icon: Download, onSelect: () => demoOnly("Export") },
            { label: "Imprimer", icon: Printer, onSelect: () => demoOnly("Impression") },
          ]}
        />

        <nav aria-label="Sections de la galerie" className="-mt-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label">
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex min-h-6 items-center text-foreground-muted underline underline-offset-2 hover:text-foreground touch:min-h-touch">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Section id="fondations" title="Fondations" description="Neutres, orange de marque réservé à l'action, échelle typographique, rayons courts pour les surfaces et pilule pour les boutons.">
          <Card className="flex flex-col gap-5">
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
              {SWATCHES.map((swatch) => (
                <li key={swatch.name} className="flex flex-col gap-1">
                  <span className={`h-10 rounded-control border border-border-strong ${swatch.className}`} />
                  <span className="text-meta text-foreground-muted">{swatch.name}</span>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-3">
              {TYPE_SCALE.map((step) => (
                <li key={step.name} className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:gap-4">
                  <span className="w-56 shrink-0 text-meta text-foreground-subtle">{step.name}</span>
                  <span className={step.className}>{step.sample}</span>
                </li>
              ))}
            </ul>
            <Row label="Rayons : compact 4 · control 6 · panel 8 · pill (badges, avatars) · button (tous les boutons)">
              {(["rounded-compact", "rounded-control", "rounded-panel", "rounded-pill", "rounded-button"] as const).map((radius) => (
                <span key={radius} className={`flex h-10 w-24 items-center justify-center border border-border-strong bg-surface-subtle text-meta text-foreground-muted ${radius}`}>
                  {radius.replace("rounded-", "")}
                </span>
              ))}
            </Row>
          </Card>
        </Section>

        <Section id="boutons" title="Boutons et actions" description="Quatre variantes, deux tailles, toujours en pilule. Une icône Lucide accompagne chaque action importante.">
          <Card className="flex flex-col gap-5">
            <Row label="Variantes · taille par défaut">
              <Button variant="primary" icon={Plus} onClick={() => demoOnly("Créer")}>
                Créer un produit
              </Button>
              <Button variant="secondary" icon={Download} onClick={() => demoOnly("Export")}>
                Exporter
              </Button>
              <Button variant="quiet" icon={RefreshCw} onClick={() => demoOnly("Actualiser")}>
                Actualiser
              </Button>
              <Button variant="destructive" icon={Trash2} onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            </Row>
            <Row label="Taille compacte">
              <Button size="compact" variant="primary" icon={Save}>
                Enregistrer
              </Button>
              <Button size="compact" icon={Pencil}>
                Modifier
              </Button>
              <Button size="compact" variant="quiet" icon={Printer}>
                Imprimer
              </Button>
            </Row>
            <Row label="États : chargement, désactivé">
              <Button variant="primary" icon={Save} loading>
                Enregistrement
              </Button>
              <Button icon={Download} loading>
                Export en cours
              </Button>
              <Button variant="primary" icon={Plus} disabled>
                Créer un produit
              </Button>
              <Button icon={Download} disabled>
                Exporter
              </Button>
            </Row>
            <Row label="Boutons icône (nom accessible obligatoire), groupe, menu, infobulle">
              <IconButton icon={Bell} label="Notifications" />
              <IconButton icon={Pencil} label="Modifier" variant="secondary" />
              <IconButton icon={Trash2} label="Supprimer" variant="secondary" disabled />
              <ButtonGroup label="Affichage">
                <Button icon={List} aria-pressed={view === "list"} onClick={() => setView("list")}>
                  Liste
                </Button>
                <Button icon={LayoutGrid} aria-pressed={view === "grid"} onClick={() => setView("grid")}>
                  Grille
                </Button>
              </ButtonGroup>
              <DropdownMenu
                align="start"
                trigger={
                  <Button icon={PackagePlus} trailingIcon={ChevronDown}>
                    Ajouter
                  </Button>
                }
              >
                <DropdownMenuLabel>Catalogue</DropdownMenuLabel>
                <DropdownMenuItem icon={Plus} onSelect={() => demoOnly("Nouveau produit")}>
                  Nouveau produit
                </DropdownMenuItem>
                <DropdownMenuItem icon={Download} onSelect={() => demoOnly("Import")}>
                  Importer un fichier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => setConfirmDelete(true)}>
                  Vider les brouillons
                </DropdownMenuItem>
              </DropdownMenu>
              <Tooltip content="Complément d'information au survol et au focus">
                <Button variant="quiet">Infobulle</Button>
              </Tooltip>
            </Row>
          </Card>
        </Section>

        <Section id="statuts" title="Badges et statuts" description="Un registre par domaine, calé sur les enums du backend. Chaque statut a un libellé, un ton et une icône ; un code inconnu reste « inconnu ».">
          <Card className="flex flex-col gap-5">
            <Row label="Tons">
              <Badge tone="neutral">Neutre</Badge>
              <Badge tone="info">Information</Badge>
              <Badge tone="success">Succès</Badge>
              <Badge tone="warning">Attention</Badge>
              <Badge tone="danger">Danger</Badge>
            </Row>
            {STATUS_DOMAINS.map(({ domain, title }) => (
              <Row key={domain} label={title}>
                {statusRegistries[domain].codes.map((code) => (
                  <StatusBadge key={code} domain={domain} code={code} />
                ))}
              </Row>
            ))}
            <Row label="Code non reconnu, code absent">
              <StatusBadge domain="order" code="teleported" />
              <StatusBadge domain="delivery" code={null} />
            </Row>
          </Card>
        </Section>

        <Section id="kpi" title="KPI" description="Même apparence pour tous : la couleur ne sert qu'au sens de la variation.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Chiffre d'affaires"
              value={formatMoneyFromFrancs(1250000)}
              icon={Wallet}
              trend={{ direction: "up", label: "+12 %", sentiment: "positive" }}
              hint="sur 30 jours"
            />
            <Stat
              label="Commandes"
              value="184"
              icon={ShoppingCart}
              trend={{ direction: "down", label: "-4 %", sentiment: "negative" }}
              hint="sur 30 jours"
            />
            <Stat
              label="Échecs de livraison"
              value="3"
              icon={Truck}
              trend={{ direction: "down", label: "-2", sentiment: "positive" }}
              hint="sur 30 jours"
            />
            <Stat label="Solde disponible" value="" icon={Wallet} loading />
          </div>
        </Section>

        <Section id="retours" title="Retours et états" description="Alertes, vide, erreur, chargement, avatars.">
          <div className="grid gap-3 md:grid-cols-2">
            <Alert tone="info" title="Versement programmé">
              Votre prochain versement part vendredi.
            </Alert>
            <Alert tone="success" title="Produit publié">
              Il est visible par les acheteurs.
            </Alert>
            <Alert
              tone="warning"
              title="Stock faible sur 3 produits"
              actions={
                <Button size="compact" icon={PackagePlus} onClick={() => demoOnly("Réapprovisionner")}>
                  Réapprovisionner
                </Button>
              }
            >
              Réapprovisionnez pour éviter une rupture.
            </Alert>
            <Alert tone="danger" title="Paiement refusé">
              L&apos;opérateur a rejeté la transaction.
            </Alert>
            <Card flush>
              <EmptyState
                title="Aucun produit"
                description="Ajoutez votre premier produit pour commencer à vendre."
                action={
                  <Button variant="primary" icon={Plus} onClick={() => demoOnly("Créer un produit")}>
                    Créer un produit
                  </Button>
                }
              />
            </Card>
            <Card flush>
              <ErrorState onRetry={() => demoOnly("Nouvel essai")} />
            </Card>
            <Card className="flex flex-col gap-2" role="status" aria-label="Chargement">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-4 w-52" />
            </Card>
            <Card className="flex items-center gap-3">
              <Avatar name="Awa Démo" size="sm" />
              <Avatar name="Issouf Exemple" />
              <Avatar name="Agence Démo Centre" size="lg" />
              <span className="text-meta text-foreground-muted">Avatars : initiales si aucune image.</span>
            </Card>
          </div>
        </Section>

        <Section id="formulaires" title="Formulaires" description="Libellé, aide, erreur et succès reliés au champ. Validation Zod à l'envoi, récapitulatif des erreurs en tête.">
          <SaleFormDemo />
          <StepperDemo />
        </Section>

        <Section id="table" title="Barre d'outils et DataTable" description="Tri, recherche, filtre et pagination passent par le « serveur » simulé : la table n'affiche que la page reçue.">
          <OrdersTableDemo />
        </Section>

        <Section id="telephone" title="Liste téléphone" description="La même table dans un cadre de 375 px : chaque colonne déclare son rôle dans la carte, les actions restent accessibles.">
          <PhoneListDemo />
        </Section>

        <Section id="navigation" title="Navigation locale" description="Onglets, pagination, fil d'Ariane.">
          <Card className="flex flex-col gap-5">
            <Tabs defaultValue="all">
              <TabsList label="Filtrer les commandes par état">
                <TabsTrigger value="all" count={57}>
                  Toutes
                </TabsTrigger>
                <TabsTrigger value="todo" count={8}>
                  À préparer
                </TabsTrigger>
                <TabsTrigger value="shipped" count={7}>
                  Expédiées
                </TabsTrigger>
                <TabsTrigger value="archived" disabled>
                  Archivées
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all">Toutes les commandes.</TabsContent>
              <TabsContent value="todo">Commandes à préparer.</TabsContent>
              <TabsContent value="shipped">Commandes expédiées.</TabsContent>
            </Tabs>
            <Pagination page={page} pageSize={20} total={134} onPageChange={setPage} itemLabel="produits" />
            <Breadcrumbs
              items={[
                { label: "Commandes", href: "/dev/ui#table" },
                { label: "SU-2026-004100", href: "/dev/ui#table" },
                { label: "Bon de livraison" },
              ]}
            />
          </Card>
        </Section>

        <Section id="overlays" title="Overlays" description="Dialogue, confirmation, panneau latéral et panneau bas. Échap ferme, le focus revient au déclencheur.">
          <Card className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button icon={Pencil}>Ouvrir un dialogue</Button>
              </DialogTrigger>
              <DialogContent
                title="Modifier le stock"
                description="Pagne tissé (démo)"
                footer={
                  <>
                    <DialogClose asChild>
                      <Button variant="secondary">Annuler</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="primary" icon={Save} onClick={() => demoOnly("Stock")}>
                        Enregistrer
                      </Button>
                    </DialogClose>
                  </>
                }
              >
                <FormField label="Quantité en stock" hint="Nombre d'unités disponibles à la vente.">
                  <Input inputMode="numeric" defaultValue="24" />
                </FormField>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" icon={Trash2} onClick={() => setConfirmDelete(true)}>
              Demander une confirmation
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button icon={Truck}>Ouvrir un panneau latéral</Button>
              </SheetTrigger>
              <SheetContent
                title="Livraison SU-2026-004100"
                description="Détail de démonstration"
                footer={
                  <SheetClose asChild>
                    <Button variant="secondary">Fermer</Button>
                  </SheetClose>
                }
              >
                <div className="flex flex-col gap-3">
                  <StatusBadge domain="delivery" code="in_transit" />
                  <p className="text-body text-foreground-muted">
                    Le panneau garde la liste visible derrière lui : utile pour consulter un détail sans quitter la page.
                  </p>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button icon={List}>Ouvrir un panneau bas</Button>
              </SheetTrigger>
              <SheetContent side="bottom" title="Actions">
                <div className="flex flex-col gap-2">
                  <SheetClose asChild>
                    <Button icon={Download} onClick={() => demoOnly("Export")}>
                      Exporter
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button icon={Printer} onClick={() => demoOnly("Impression")}>
                      Imprimer
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </Card>
        </Section>

        <Section id="argent" title="Argent" description="L'unité fait partie du nom de la fonction : centimes ou francs, jamais deviné.">
          <Card>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-[auto_1fr]">
              {(
                [
                  ["formatMoneyFromCents(5 000 000)", formatMoneyFromCents(5000000)],
                  ["formatMoneyFromFrancs(50 000)", formatMoneyFromFrancs(50000)],
                  ["formatMoneyFromFrancs(0)", formatMoneyFromFrancs(0)],
                  ["formatMoneyFromFrancs(null)", formatMoneyFromFrancs(null)],
                  ["formatMoneyFromCents(-1 250 000)", formatMoneyFromCents(-1250000)],
                  ["formatMoneyFromFrancs(1 234 567 890)", formatMoneyFromFrancs(1234567890)],
                  ["formatMoneyFromFrancs(7 500, { showPlus })", formatMoneyFromFrancs(7500, { showPlus: true })],
                ] as const
              ).map(([call, output]) => (
                <div key={call} className="contents">
                  <dt className="text-meta text-foreground-muted">{call}</dt>
                  <dd className="text-body tabular-nums">{output}</dd>
                </div>
              ))}
              <div className="contents">
                <dt className="text-meta text-foreground-muted">{"<Money cents={150000} />"}</dt>
                <dd className="text-body">
                  <Money cents={150000} />
                </dd>
              </div>
            </dl>
          </Card>
        </Section>
      </main>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        tone="danger"
        title="Supprimer ce produit ?"
        description="Cette action est définitive. Démonstration : rien n'est supprimé."
        confirmLabel="Supprimer"
        confirmIcon={Trash2}
        onConfirm={() => demoOnly("Suppression")}
      />
    </div>
  );
}
