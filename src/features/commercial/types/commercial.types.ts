export interface CommercialCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface CommercialCountry {
  code: string;
  name: string;
  phone_code: string;
  flag_emoji: string;
}

export interface CommercialConfig {
  enabled: boolean;
  disabled_message?: string;
  categories: CommercialCategory[];
  countries: CommercialCountry[];
}

export interface CommercialFormData {
  agent_name: string;
  agent_phone: string;
  store_name: string;
  description: string;
  category_ids: string[];
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  country: string;
  city: string;
  address: string;
  neighborhood: string;
  lat: number | null;
  lng: number | null;
  logo: File | null;
  cover: File | null;
  payment_provider: string;
  payment_phone: string;
  payment_account_name: string;
  security_code: string;
}

export interface CommercialStoreResponse {
  success: boolean;
  message: string;
  submission_id: string;
}
