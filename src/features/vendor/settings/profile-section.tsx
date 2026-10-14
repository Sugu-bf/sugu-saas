"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Facebook, Globe, Instagram, MessageCircle, Store } from "lucide-react";
import { Alert, Button, FormField, Input, Select, Switch, Textarea } from "@/design-system";
import { env } from "@/lib/env";
import { CountedTextarea, ImageField, PhoneInput, SettingsForm, SettingsGroup, describeSettingsFailure, useDraft } from "@/features/settings";
import { saveContact, saveIdentity, saveOwner, saveShowSocial, uploadStorePicture, type SocialNetwork, type VendorSettingsModel } from "./api";
import { useStoreCategoryOptions, vendorSettingsKeys } from "./hooks";

// "Mon profil" of the seller, after frame 1 of the V9 mock-up: the
// shop on the left (pictures, name, category, description), the
// contact on the right (who runs it, how to reach it, where it is),
// then the address of the shop on the marketplace and its links.
//
// Four calls of the server stand behind this one form (identity,
// contact, owner, display of the links). Only the parts that changed
// are sent, one after the other; when one is refused the others stay
// saved and the form says exactly which part was not.

interface ProfileValues {
  name: string;
  category: string;
  description: string;
  slug: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  website: string;
  showSocial: boolean;
}

type Part = "identity" | "contact" | "owner" | "links";

const PARTS: Record<Part, { label: string; keys: (keyof ProfileValues)[] }> = {
  identity: { label: "les informations de la boutique", keys: ["name", "category", "description", "slug"] },
  contact: { label: "les coordonnées et les liens", keys: ["phone", "email", "street", "city", "whatsapp", "facebook", "instagram", "website"] },
  owner: { label: "le nom du responsable", keys: ["firstName", "lastName"] },
  links: { label: "l'affichage des liens sur la boutique", keys: ["showSocial"] },
};

/** The server's field names → the form's. */
const SERVER_FIELDS: Record<string, keyof ProfileValues> = {
  storeName: "name",
  slug: "slug",
  description: "description",
  storeType: "category",
  email: "email",
  phone: "phone",
  "address.street": "street",
  "address.city": "city",
  "socials.whatsapp": "whatsapp",
  "socials.facebook": "facebook",
  "socials.instagram": "instagram",
  "socials.website": "website",
  firstName: "firstName",
  lastName: "lastName",
};

const SOCIAL_FIELDS: { key: SocialNetwork; label: string; icon: typeof Globe; placeholder: string }[] = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "+226 70 00 00 00" },
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "facebook.com/votre-boutique" },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "instagram.com/votre-boutique" },
  { key: "website", label: "Site web", icon: Globe, placeholder: "https://…" },
];

function toValues(model: VendorSettingsModel): ProfileValues {
  return {
    name: model.shop.name,
    category: model.shop.category,
    description: model.shop.description,
    slug: model.shop.slug,
    firstName: model.owner.firstName,
    lastName: model.owner.lastName,
    phone: model.contact.phone,
    email: model.contact.email,
    street: model.contact.street,
    city: model.contact.city,
    ...model.socials,
    showSocial: model.showSocialOnShop,
  };
}

function validate(values: ProfileValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.name.trim().length < 2) errors.name = "Indiquez le nom de la boutique.";
  if (!values.category) errors.category = "Choisissez la catégorie de la boutique.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) errors.slug = "Lettres minuscules, chiffres et tirets seulement (ex. boutique-tech).";
  if (!values.phone.trim()) errors.phone = "Indiquez le téléphone de la boutique.";
  else if (!/^\+?[0-9 ().-]{6,30}$/.test(values.phone.trim())) errors.phone = "Ce numéro n'est pas valide.";
  if (!values.email.trim()) errors.email = "Indiquez l'e-mail de contact de la boutique.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Cette adresse e-mail n'est pas valide.";
  if (values.website && !/^(https?:\/\/)?[^\s/$.?#].[^\s]*$/i.test(values.website)) errors.website = "Cette adresse n'est pas valide.";
  return errors;
}

export function ProfileSection({ model }: { model: VendorSettingsModel }) {
  const client = useQueryClient();
  const draft = useDraft(toValues(model), "vendor-profile");
  const categories = useStoreCategoryOptions();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "warning" | "danger"; title: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const lock = useRef(false);
  const { values, set, errors } = draft;

  const storeUrl = `${env.NEXT_PUBLIC_MARKETPLACE_URL.replace(/\/+$/, "")}/store/${model.shop.slug}`;
  const refresh = () => client.invalidateQueries({ queryKey: vendorSettingsKeys.settings(), exact: true });

  const submit = async () => {
    if (lock.current) return;
    const local = validate(values);
    draft.setErrors(local);
    setNotice(null);
    if (Object.keys(local).length > 0) {
      toast.error("Certaines informations sont à corriger.");
      return;
    }
    const todo = (Object.keys(PARTS) as Part[]).filter((part) => PARTS[part].keys.some((key) => draft.changed.includes(key)));
    if (todo.length === 0) return;

    lock.current = true;
    setSaving(true);
    const saved: Part[] = [];
    const failed: { part: Part; message: string }[] = [];
    const fieldErrors: Record<string, string> = {};
    for (const part of todo) {
      try {
        if (part === "identity") await saveIdentity(values);
        if (part === "contact") await saveContact(values, { whatsapp: values.whatsapp, facebook: values.facebook, instagram: values.instagram, website: values.website });
        if (part === "owner") await saveOwner(values);
        if (part === "links") await saveShowSocial(values.showSocial);
        saved.push(part);
        draft.commit(PARTS[part].keys);
      } catch (error) {
        const failure = describeSettingsFailure(error);
        for (const [field, message] of Object.entries(failure.fields)) {
          const mapped = SERVER_FIELDS[field];
          if (mapped) fieldErrors[mapped] = message;
        }
        failed.push({ part, message: failure.message });
        // A lost session or connection: the next parts would fail the same way.
        if (failure.kind === "unauthorized" || failure.kind === "network") break;
      }
    }
    draft.setErrors(fieldErrors);
    lock.current = false;
    setSaving(false);
    if (saved.length > 0) void refresh();

    const notSent = todo.filter((part) => !saved.includes(part) && !failed.some((f) => f.part === part));
    if (failed.length === 0) {
      toast.success("Profil enregistré.");
      return;
    }
    const savedText = saved.length > 0 ? `Enregistré : ${saved.map((part) => PARTS[part].label).join(", ")}. ` : "";
    const failedText = failed.map((f) => `${PARTS[f.part].label} — ${f.message}`).join(" ");
    const pendingText = notSent.length > 0 ? ` Non envoyé : ${notSent.map((part) => PARTS[part].label).join(", ")}.` : "";
    setNotice({
      tone: saved.length > 0 ? "warning" : "danger",
      title: saved.length > 0 ? "Enregistrement partiel" : "Rien n'a été enregistré",
      body: `${savedText}Non enregistré : ${failedText}${pendingText} Vos saisies sont conservées.`,
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Le lien n'a pas pu être copié.");
    }
  };

  const initials = (model.shop.name || "S")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <SettingsForm
      title="Mon profil"
      description="Informations publiques de votre boutique et coordonnées"
      dirty={draft.dirty}
      saving={saving}
      onSubmit={submit}
      onReset={() => {
        draft.reset();
        setNotice(null);
      }}
      notice={notice && <Alert tone={notice.tone} title={notice.title}>{notice.body}</Alert>}
    >
      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <SettingsGroup title="Informations de la boutique">
          <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
            <ImageField
              label="Logo de la boutique"
              url={model.shop.logoUrl}
              placeholder={<span className="text-section-title font-bold text-foreground">{initials}</span>}
              maxBytes={2 * 1024 * 1024}
              hint="PNG, JPG (max. 2 Mo)"
              buttonLabel="Changer le logo"
              onUpload={async (file) => {
                await uploadStorePicture("logo", file);
                await refresh();
                toast.success("Logo enregistré.");
              }}
            />
            <ImageField
              label="Bannière de la boutique"
              url={model.shop.coverUrl}
              placeholder={<Store className="size-6 text-foreground-subtle" aria-hidden="true" />}
              shape="banner"
              maxBytes={5 * 1024 * 1024}
              hint="PNG, JPG (max. 5 Mo)"
              buttonLabel="Changer la bannière"
              onUpload={async (file) => {
                await uploadStorePicture("cover", file);
                await refresh();
                toast.success("Bannière enregistrée.");
              }}
            />
          </div>
          <FormField label="Nom de la boutique" required error={errors.name}>
            <Input value={values.name} onChange={(event) => set("name", event.target.value)} maxLength={255} autoComplete="organization" />
          </FormField>
          <FormField label="Catégorie" required error={errors.category} hint={categories.isError ? "La liste des catégories n'a pas pu être chargée." : undefined}>
            <Select
              value={values.category}
              onChange={(event) => set("category", event.target.value)}
              placeholder={categories.isPending ? "Chargement…" : "Choisir une catégorie"}
              options={[
                ...(categories.data ?? []).map((category) => ({ value: category.name, label: category.name })),
                // The current one stays selectable even if the list is not there.
                ...(values.category && !(categories.data ?? []).some((category) => category.name === values.category) ? [{ value: values.category, label: values.category }] : []),
              ]}
            />
          </FormField>
          <FormField label="Description" error={errors.description} hint="Visible sur la page de votre boutique.">
            <CountedTextarea value={values.description} onChange={(event) => set("description", event.target.value)} maxLength={2000} rows={4} />
          </FormField>
        </SettingsGroup>

        <SettingsGroup title="Informations de contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Prénom du responsable" error={errors.firstName}>
              <Input value={values.firstName} onChange={(event) => set("firstName", event.target.value)} autoComplete="given-name" maxLength={100} />
            </FormField>
            <FormField label="Nom du responsable" error={errors.lastName}>
              <Input value={values.lastName} onChange={(event) => set("lastName", event.target.value)} autoComplete="family-name" maxLength={100} />
            </FormField>
          </div>
          <FormField label="Téléphone" required error={errors.phone} hint="Affiché aux clients sur votre boutique.">
            <PhoneInput value={values.phone} onChange={(event) => set("phone", event.target.value)} maxLength={30} />
          </FormField>
          <FormField label="Email" required error={errors.email} hint={`L'adresse de connexion de votre compte (${model.owner.loginEmail || "non renseignée"}) ne change pas.`}>
            <Input type="email" value={values.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" maxLength={255} />
          </FormField>
          <FormField label="Adresse de la boutique" error={errors.street} hint="C'est là que les livreurs viennent chercher vos colis.">
            <Textarea value={values.street} onChange={(event) => set("street", event.target.value)} rows={2} maxLength={500} autoComplete="street-address" />
          </FormField>
          <FormField label="Ville" error={errors.city}>
            <Input value={values.city} onChange={(event) => set("city", event.target.value)} maxLength={100} autoComplete="address-level2" />
          </FormField>
        </SettingsGroup>
      </div>

      <div className="border-t border-border pt-6">
        <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <SettingsGroup title="Adresse de la boutique sur SUGU" description="Le lien de votre page publique. Le changer rend l'ancien lien inutilisable.">
            <FormField label="Identifiant" error={errors.slug}>
              <Input value={values.slug} onChange={(event) => set("slug", event.target.value.toLowerCase())} maxLength={255} spellCheck={false} autoCapitalize="none" />
            </FormField>
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 truncate text-meta text-foreground-muted tabular-nums">{storeUrl}</span>
              <Button type="button" variant="quiet" size="compact" icon={copied ? Check : Copy} onClick={copyLink}>
                {copied ? "Copié" : "Copier"}
              </Button>
              <Button asChild variant="quiet" size="compact" icon={ExternalLink}>
                <a href={storeUrl} target="_blank" rel="noreferrer">
                  Voir la boutique
                </a>
              </Button>
            </div>
          </SettingsGroup>

          <SettingsGroup title="Réseaux et liens" description="Montrés sur votre boutique si vous le choisissez.">
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_FIELDS.map((field) => (
                <FormField key={field.key} label={field.label} error={errors[field.key]}>
                  <Input leadingIcon={field.icon} value={values[field.key]} onChange={(event) => set(field.key, event.target.value)} placeholder={field.placeholder} maxLength={500} spellCheck={false} autoCapitalize="none" />
                </FormField>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5">
              <span id="show-social" className="text-body text-foreground">
                Afficher ces liens sur la page de la boutique
              </span>
              <Switch checked={values.showSocial} onCheckedChange={(checked) => set("showSocial", checked)} aria-labelledby="show-social" />
            </div>
          </SettingsGroup>
        </div>
      </div>
    </SettingsForm>
  );
}
