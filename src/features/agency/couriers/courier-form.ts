import type { CourierUpdateRequest, NewCourierRequest } from "./api";
import { vehicleFormValue, type Courier } from "./contract";

// ============================================================
// The record of a courier as the agency types it: when it adds
// him (`POST …/couriers/register`, RegisterCourierRequest) and
// when it edits him (`PUT …/couriers/{id}`, UpdateCourierRequest).
// The form state, what each step requires, the requests it becomes.
// ============================================================

export type VehicleChoice = "moto" | "velo" | "voiture" | "tricycle";

export interface CourierForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: "" | "homme" | "femme";
  quartier: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  vehicleType: VehicleChoice | "";
  vehicleMake: string;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleYear: string;
  /** Registration only: sends the courier a link to set his password. Needs an e-mail. */
  sendInvitation: boolean;
}

export const EMPTY_COURIER_FORM: CourierForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  quartier: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  vehicleType: "",
  vehicleMake: "",
  vehiclePlate: "",
  vehicleColor: "",
  vehicleYear: "",
  sendInvitation: false,
};

export const COURIER_STEPS = [
  { id: "identity", label: "Identité" },
  { id: "vehicle", label: "Véhicule" },
  { id: "access", label: "Pièces et accès" },
] as const;

export type CourierStepId = (typeof COURIER_STEPS)[number]["id"];
export type CourierField = keyof CourierForm;

export const COURIER_FIELDS: Record<CourierField, { label: string; id: string; step: CourierStepId }> = {
  firstName: { label: "Prénom", id: "courier-first-name", step: "identity" },
  lastName: { label: "Nom", id: "courier-last-name", step: "identity" },
  phone: { label: "Téléphone", id: "courier-phone", step: "identity" },
  email: { label: "E-mail", id: "courier-email", step: "identity" },
  dateOfBirth: { label: "Date de naissance", id: "courier-date-of-birth", step: "identity" },
  gender: { label: "Genre", id: "courier-gender", step: "identity" },
  quartier: { label: "Quartier", id: "courier-quartier", step: "identity" },
  address: { label: "Adresse", id: "courier-address", step: "identity" },
  emergencyContactName: { label: "Personne à prévenir", id: "courier-emergency-name", step: "identity" },
  emergencyContactPhone: { label: "Téléphone de cette personne", id: "courier-emergency-phone", step: "identity" },
  vehicleType: { label: "Type de véhicule", id: "courier-vehicle-type", step: "vehicle" },
  vehicleMake: { label: "Marque et modèle", id: "courier-vehicle-make", step: "vehicle" },
  vehiclePlate: { label: "Immatriculation", id: "courier-vehicle-plate", step: "vehicle" },
  vehicleColor: { label: "Couleur", id: "courier-vehicle-color", step: "vehicle" },
  vehicleYear: { label: "Année", id: "courier-vehicle-year", step: "vehicle" },
  sendInvitation: { label: "Invitation par e-mail", id: "courier-send-invitation", step: "access" },
};

/** Fields of the API, as a 422 names them, to the fields of the form. */
export const COURIER_SERVER_FIELD: Record<string, CourierField> = {
  first_name: "firstName",
  last_name: "lastName",
  phone: "phone",
  phone_e164: "phone",
  email: "email",
  date_of_birth: "dateOfBirth",
  gender: "gender",
  quartier: "quartier",
  address: "address",
  emergency_contact_name: "emergencyContactName",
  emergency_contact_phone: "emergencyContactPhone",
  vehicle_type: "vehicleType",
  vehicle_make: "vehicleMake",
  vehicle_plate: "vehiclePlate",
  vehicle_color: "vehicleColor",
  vehicle_year: "vehicleYear",
};

export const VEHICLE_OPTIONS: { value: VehicleChoice; label: string; description: string }[] = [
  { value: "moto", label: "Moto", description: "Deux-roues motorisé." },
  { value: "velo", label: "Vélo", description: "Petits colis, courtes distances." },
  { value: "tricycle", label: "Tricycle", description: "Colis volumineux." },
  { value: "voiture", label: "Voiture", description: "Colis fragiles ou nombreux." },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (phone: string) => phone.replace(/\D/g, "");

/** Sixteen years before today: the youngest a courier may be. */
function sixteenYearsAgo(now: Date): Date {
  return new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
}

/**
 * What stops the form, field by field. `mode` says which rules apply: a
 * registration needs a vehicle type; an edit leaves what is not typed as it is.
 * With a step, only the fields of that step are checked.
 */
export function validateCourierForm(form: CourierForm, mode: "register" | "edit", step?: CourierStepId, now: Date = new Date()): Partial<Record<CourierField, string>> {
  const errors: Partial<Record<CourierField, string>> = {};

  if (form.firstName.trim().length < 2) errors.firstName = "Le prénom compte au moins 2 caractères.";
  else if (form.firstName.trim().length > 100) errors.firstName = "100 caractères au plus.";
  // A courier recorded under one name only keeps it: the edit does not ask for a second.
  const lastName = form.lastName.trim();
  if (lastName.length < 2 && !(mode === "edit" && lastName === "")) errors.lastName = "Le nom compte au moins 2 caractères.";
  else if (lastName.length > 100) errors.lastName = "100 caractères au plus.";

  if (form.phone.trim() === "") errors.phone = "Indiquez son numéro : il s'en sert pour se connecter.";
  else if (digits(form.phone).length < 8) errors.phone = "Ce numéro est trop court.";
  else if (form.phone.trim().length > 20) errors.phone = "20 caractères au plus.";

  if (form.email.trim() !== "" && !EMAIL.test(form.email.trim())) errors.email = "Cette adresse e-mail n'est pas valide.";

  if (form.dateOfBirth !== "") {
    const born = new Date(`${form.dateOfBirth}T00:00:00`);
    if (Number.isNaN(born.getTime())) errors.dateOfBirth = "Cette date n'est pas valide.";
    else if (born > sixteenYearsAgo(now)) errors.dateOfBirth = "Un livreur doit avoir au moins 16 ans.";
  }

  if (form.quartier.length > 255) errors.quartier = "255 caractères au plus.";
  if (form.address.length > 500) errors.address = "500 caractères au plus.";
  if (form.emergencyContactPhone.trim() !== "" && digits(form.emergencyContactPhone).length < 8) errors.emergencyContactPhone = "Ce numéro est trop court.";

  if (mode === "register" && form.vehicleType === "") errors.vehicleType = "Choisissez son véhicule.";
  if (form.vehicleMake.length > 100) errors.vehicleMake = "100 caractères au plus.";
  if (form.vehiclePlate.length > 20) errors.vehiclePlate = "20 caractères au plus.";
  if (form.vehicleColor.length > 50) errors.vehicleColor = "50 caractères au plus.";
  if (form.vehicleYear.trim() !== "" && !/^(19|20)\d{2}$/.test(form.vehicleYear.trim())) errors.vehicleYear = "Une année sur quatre chiffres, par exemple 2022.";

  if (form.sendInvitation && form.email.trim() === "") errors.sendInvitation = "Une invitation demande son adresse e-mail (étape Identité).";

  if (!step) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([field]) => COURIER_FIELDS[field as CourierField].step === step));
}

const optional = (value: string) => value.trim() || undefined;

/** The registration the form becomes. Call it on a form `validateCourierForm` accepts. */
export function registerRequestOf(form: CourierForm): NewCourierRequest & { send_email: boolean; send_sms: boolean } {
  return {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    phone: form.phone.trim(),
    email: optional(form.email),
    date_of_birth: form.dateOfBirth || undefined,
    gender: form.gender || undefined,
    quartier: optional(form.quartier),
    address: optional(form.address),
    vehicle_type: form.vehicleType as VehicleChoice,
    vehicle_make: optional(form.vehicleMake),
    vehicle_plate: optional(form.vehiclePlate),
    vehicle_color: optional(form.vehicleColor),
    vehicle_year: optional(form.vehicleYear),
    send_email: form.sendInvitation && form.email.trim() !== "",
    // The backend sends no SMS (it only writes a log line): never claimed here.
    send_sms: false,
  };
}

/**
 * The update the form becomes. Every field of the record is sent, emptied
 * ones as empty strings: the server removes what is emptied.
 */
export function updateRequestOf(form: CourierForm): CourierUpdateRequest {
  return {
    first_name: form.firstName.trim(),
    last_name: optional(form.lastName),
    phone: form.phone.trim(),
    email: optional(form.email),
    quartier: form.quartier.trim(),
    address: form.address.trim(),
    emergency_contact_name: form.emergencyContactName.trim(),
    emergency_contact_phone: form.emergencyContactPhone.trim(),
    vehicle_type: form.vehicleType || undefined,
    vehicle_make: form.vehicleMake.trim(),
    vehicle_plate: form.vehiclePlate.trim(),
    vehicle_color: form.vehicleColor.trim(),
    vehicle_year: form.vehicleYear.trim(),
  };
}

/**
 * The form of an existing courier. His first name and his name are the ones
 * the server answers, as they were typed. A backend that answers his whole
 * name only has it cut at its first word: a compound first name then comes
 * back in two.
 */
export function courierFormOf(courier: Courier): CourierForm {
  const [firstWord, ...rest] = courier.name.trim().split(/\s+/);
  return {
    ...EMPTY_COURIER_FORM,
    firstName: courier.names?.first ?? firstWord ?? "",
    lastName: courier.names ? courier.names.last : rest.join(" "),
    phone: courier.phone ?? "",
    email: courier.email ?? "",
    dateOfBirth: courier.dateOfBirth ?? "",
    gender: courier.gender === "homme" || courier.gender === "femme" ? courier.gender : "",
    quartier: courier.quartier ?? "",
    address: courier.address ?? "",
    emergencyContactName: courier.emergencyContactName ?? "",
    emergencyContactPhone: courier.emergencyContactPhone ?? "",
    vehicleType: vehicleFormValue(courier.vehicleType),
    vehicleMake: courier.vehicleMake ?? "",
    vehiclePlate: courier.vehiclePlate ?? "",
    vehicleColor: courier.vehicleColor ?? "",
    vehicleYear: courier.vehicleYear ?? "",
  };
}
