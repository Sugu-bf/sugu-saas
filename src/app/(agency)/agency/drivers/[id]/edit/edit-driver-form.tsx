"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bike, Check, User } from "lucide-react";
import { Button, ErrorState, FormActions, FormErrorSummary, PageHeader, Skeleton } from "@/design-system";
import { CourierIdentityFields, CourierVehicleFields } from "@/features/agency/components/courier-fields";
import { AgencyPage } from "@/features/agency/components/page";
import { Panel } from "@/features/agency/components/panel";
import type { Courier } from "@/features/agency/couriers/contract";
import {
  COURIER_FIELDS,
  COURIER_SERVER_FIELD,
  courierFormOf,
  updateRequestOf,
  validateCourierForm,
  type CourierField,
  type CourierForm,
} from "@/features/agency/couriers/courier-form";
import { useCourier, useCourierAction } from "@/features/agency/couriers/hooks";
import { describeAgencyFailure } from "@/features/agency/errors";

const LIST = "/agency/drivers";

type Errors = Partial<Record<CourierField, string>>;

/**
 * The record of a courier: who he is, how to reach him, what he rides. His
 * account (pause, suspension, documents, rate) is handled from his page.
 */
export function EditDriverForm({ id }: { id: string }) {
  const query = useCourier(id);

  if (query.isError) {
    const failure = describeAgencyFailure(query.error);
    return (
      <AgencyPage className="max-w-3xl">
        <PageHeader title="Modifier le livreur" back={{ label: "Retour aux livreurs", href: LIST }} />
        <div className="rounded-panel border border-border bg-surface">
          <ErrorState
            title={failure.kind === "not_found" ? "Ce livreur est introuvable" : "La fiche du livreur n'a pas pu être chargée"}
            description={failure.message}
            onRetry={failure.kind === "not_found" ? undefined : () => query.refetch()}
            retrying={query.isFetching}
          />
        </div>
      </AgencyPage>
    );
  }

  if (!query.isSuccess) {
    return (
      <AgencyPage className="max-w-3xl" aria-busy>
        <p role="status" className="sr-only">
          Chargement de la fiche du livreur…
        </p>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-80 rounded-panel" />
        <Skeleton className="h-64 rounded-panel" />
      </AgencyPage>
    );
  }

  // Mounted once the record is there: the form starts from it, and a later refetch does not undo what is being typed.
  return <EditDriverFields courier={query.data.courier} />;
}

function EditDriverFields({ courier }: { courier: Courier }) {
  const router = useRouter();
  const action = useCourierAction();
  const [form, setForm] = useState<CourierForm>(() => courierFormOf(courier));
  const [errors, setErrors] = useState<Errors>({});
  const top = useRef<HTMLDivElement>(null);
  const page = `${LIST}/${courier.id}`;

  const set = <Field extends CourierField>(name: Field, value: CourierForm[Field]) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  function showErrors(found: Errors) {
    setErrors(found);
    top.current?.scrollIntoView({ block: "start" });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateCourierForm(form, "edit");
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }
    try {
      await action.mutateAsync({ type: "update", id: courier.id, request: updateRequestOf(form) });
      toast.success("Fiche du livreur enregistrée.");
      router.push(page);
    } catch (error) {
      const failure = describeAgencyFailure(error);
      const fromServer: Errors = {};
      for (const [name, message] of Object.entries(failure.fields)) {
        const local = COURIER_SERVER_FIELD[name];
        if (local) fromServer[local] = message;
      }
      if (Object.keys(fromServer).length > 0) showErrors(fromServer);
      toast.error(failure.message);
    }
  }

  return (
    <AgencyPage className="max-w-3xl">
      <div ref={top} className="scroll-mt-4" />
      <PageHeader
        title={`Modifier ${courier.name}`}
        description="Sa fiche : identité, coordonnées, véhicule. La pause, la suspension, ses pièces et son taux se gèrent depuis sa page."
        back={{ label: "Retour à la fiche", href: page }}
      />

      <FormErrorSummary errors={errors as Record<string, string>} fields={COURIER_FIELDS} />

      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Panel title="Identité et coordonnées" icon={User} tone="info">
          <CourierIdentityFields form={form} set={set} errors={errors} mode="edit" />
        </Panel>

        <Panel title="Véhicule" icon={Bike}>
          <CourierVehicleFields form={form} set={set} errors={errors} mode="edit" />
        </Panel>

        <FormActions sticky>
          <Button asChild disabled={action.isPending}>
            <Link href={page}>Annuler</Link>
          </Button>
          <Button type="submit" variant="primary" icon={Check} loading={action.isPending}>
            Enregistrer
          </Button>
        </FormActions>
      </form>
    </AgencyPage>
  );
}
