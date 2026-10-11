"use client";

import { FormField, Input, Radio, RadioGroup, Select } from "@/design-system";
import { COURIER_FIELDS, VEHICLE_OPTIONS, type CourierField, type CourierForm, type VehicleChoice } from "../couriers/courier-form";

// The fields of a courier's record, shared by the form that adds him and the
// one that edits him. Which ones the server takes differs between the two:
// a birth date and a gender only at registration, a person to warn only on
// an edit (RegisterCourierRequest, UpdateCourierRequest).

export interface CourierFieldsProps {
  form: CourierForm;
  set: <Field extends CourierField>(field: Field, value: CourierForm[Field]) => void;
  errors: Partial<Record<CourierField, string>>;
  mode: "register" | "edit";
}

const GENDER_OPTIONS = [
  { value: "", label: "Non précisé" },
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
];

export function CourierIdentityFields({ form, set, errors, mode }: CourierFieldsProps) {
  const field = (name: CourierField) => ({ id: COURIER_FIELDS[name].id, label: COURIER_FIELDS[name].label, error: errors[name] ?? null });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField {...field("firstName")} required>
          <Input value={form.firstName} onChange={(event) => set("firstName", event.target.value)} maxLength={100} autoComplete="off" />
        </FormField>
        <FormField {...field("lastName")} required={mode === "register"}>
          <Input value={form.lastName} onChange={(event) => set("lastName", event.target.value)} maxLength={100} autoComplete="off" />
        </FormField>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField {...field("phone")} required hint="Avec l'indicatif, par exemple +226 70 12 34 56. Il s'en sert pour se connecter.">
          <Input type="tel" inputMode="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} maxLength={20} autoComplete="off" />
        </FormField>
        <FormField {...field("email")} hint="Facultatif.">
          <Input type="email" inputMode="email" value={form.email} onChange={(event) => set("email", event.target.value)} maxLength={255} autoComplete="off" />
        </FormField>
      </div>
      {mode === "register" && (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField {...field("dateOfBirth")} hint="Facultatif. Un livreur a au moins 16 ans.">
            <Input type="date" value={form.dateOfBirth} onChange={(event) => set("dateOfBirth", event.target.value)} />
          </FormField>
          <FormField {...field("gender")}>
            <Select value={form.gender} onChange={(event) => set("gender", event.target.value as CourierForm["gender"])} options={GENDER_OPTIONS} />
          </FormField>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField {...field("quartier")} hint="Sa zone habituelle : elle sert de filtre dans la liste des livreurs.">
          <Input value={form.quartier} onChange={(event) => set("quartier", event.target.value)} maxLength={255} autoComplete="off" />
        </FormField>
        <FormField {...field("address")} hint="Facultatif.">
          <Input value={form.address} onChange={(event) => set("address", event.target.value)} maxLength={500} autoComplete="off" />
        </FormField>
      </div>
      {mode === "edit" && (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField {...field("emergencyContactName")} hint="Facultatif. En cas d'accident.">
            <Input value={form.emergencyContactName} onChange={(event) => set("emergencyContactName", event.target.value)} maxLength={255} autoComplete="off" />
          </FormField>
          <FormField {...field("emergencyContactPhone")}>
            <Input type="tel" inputMode="tel" value={form.emergencyContactPhone} onChange={(event) => set("emergencyContactPhone", event.target.value)} maxLength={20} autoComplete="off" />
          </FormField>
        </div>
      )}
    </div>
  );
}

export function CourierVehicleFields({ form, set, errors, mode }: CourierFieldsProps) {
  const field = (name: CourierField) => ({ id: COURIER_FIELDS[name].id, label: COURIER_FIELDS[name].label, error: errors[name] ?? null });
  return (
    <div className="flex flex-col gap-4">
      <div id={COURIER_FIELDS.vehicleType.id}>
        <RadioGroup
          label={COURIER_FIELDS.vehicleType.label}
          value={form.vehicleType || undefined}
          onValueChange={(value) => set("vehicleType", value as VehicleChoice)}
          required={mode === "register"}
          error={errors.vehicleType ?? null}
          className="md:grid md:grid-cols-2 md:gap-x-6"
        >
          {VEHICLE_OPTIONS.map((option) => (
            <Radio key={option.value} value={option.value} label={option.label} description={option.description} />
          ))}
        </RadioGroup>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField {...field("vehicleMake")} hint="Facultatif. Par exemple Yamaha YBR 125.">
          <Input value={form.vehicleMake} onChange={(event) => set("vehicleMake", event.target.value)} maxLength={100} autoComplete="off" />
        </FormField>
        <FormField {...field("vehiclePlate")} hint="Facultatif pour un vélo.">
          <Input value={form.vehiclePlate} onChange={(event) => set("vehiclePlate", event.target.value)} maxLength={20} autoComplete="off" />
        </FormField>
        <FormField {...field("vehicleColor")} hint="Facultatif.">
          <Input value={form.vehicleColor} onChange={(event) => set("vehicleColor", event.target.value)} maxLength={50} autoComplete="off" />
        </FormField>
        <FormField {...field("vehicleYear")} hint="Facultatif.">
          <Input inputMode="numeric" value={form.vehicleYear} onChange={(event) => set("vehicleYear", event.target.value)} maxLength={4} autoComplete="off" />
        </FormField>
      </div>
    </div>
  );
}
