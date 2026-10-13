"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Dialog, DialogContent, FormField, Input } from "@/design-system";
import { describeFailureWith } from "@/lib/http/failure";
import { checkNewClient, type Client, type NewClient, type NewClientErrors } from "../contract";
import { useCreateClient } from "../hooks";

const EMPTY: NewClient = { firstName: "", lastName: "", phone: "", email: "" };

/** Fields of the server, named as the form names them. */
const FIELD_OF: Record<string, keyof NewClient> = { firstName: "firstName", lastName: "lastName", phone: "phone", email: "email" };

/**
 * A customer the seller records by hand: a name, and a phone or an e-mail.
 * The server is the authority: it refuses a number or an address another
 * customer of the store already has, and says which.
 */
export function CreateClientDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (client: Client) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CreateClientForm onClose={() => onOpenChange(false)} onCreated={onCreated} />}
    </Dialog>
  );
}

function CreateClientForm({ onClose, onCreated }: { onClose: () => void; onCreated: (client: Client) => void }) {
  const [values, setValues] = useState<NewClient>(EMPTY);
  const [errors, setErrors] = useState<NewClientErrors>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const create = useCreateClient();

  const set = (field: keyof NewClient) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const found = checkNewClient(values);
    setErrors(found);
    setRefusal(null);
    if (Object.keys(found).length > 0) return;

    create.mutate(values, {
      onSuccess: (client) => {
        toast.success(`${client.name} a été ajouté à vos clients.`);
        onClose();
        onCreated(client);
      },
      onError: (failure) => {
        const described = describeFailureWith(failure, { validation: "Certaines informations sont à corriger." });
        const fields: NewClientErrors = {};
        for (const [key, message] of Object.entries(described.fields)) {
          if (FIELD_OF[key]) fields[FIELD_OF[key]] = message;
        }
        setErrors(fields);
        // A refusal that names no field of the form is said above it.
        if (Object.keys(fields).length === 0) setRefusal(described.message);
      },
    });
  };

  return (
    <DialogContent
      title="Ajouter un client"
      description="Un client que vous enregistrez vous-même, par exemple après une vente en boutique."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button variant="primary" icon={UserPlus} loading={create.isPending} onClick={() => submit()}>
            Ajouter le client
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {refusal && <Alert tone="danger" title={refusal} />}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Prénom" required error={errors.firstName}>
            <Input value={values.firstName} onChange={set("firstName")} autoComplete="off" maxLength={100} autoFocus />
          </FormField>
          <FormField label="Nom" required error={errors.lastName}>
            <Input value={values.lastName} onChange={set("lastName")} autoComplete="off" maxLength={100} />
          </FormField>
        </div>
        <FormField label="Téléphone" error={errors.phone} hint="Un numéro sans indicatif est enregistré au Burkina Faso (+226).">
          <Input type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} autoComplete="off" maxLength={20} placeholder="70 12 34 56" />
        </FormField>
        <FormField label="E-mail" error={errors.email} hint="Facultatif si vous avez indiqué un téléphone. Un message de bienvenue lui est envoyé.">
          <Input type="email" inputMode="email" value={values.email} onChange={set("email")} autoComplete="off" maxLength={150} />
        </FormField>
        {/* Enter in a field sends the form. */}
        <button type="submit" hidden />
      </form>
    </DialogContent>
  );
}
