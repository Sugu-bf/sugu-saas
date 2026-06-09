import { api } from "@/lib/http/client";
import type { CommercialConfig, CommercialStoreResponse, CommercialFormData } from "../types/commercial.types";

export const commercialApi = {
  getConfig: () => api.get<CommercialConfig>("public/commercial/config"),

  submitStore: (data: CommercialFormData) => {
    const fd = new FormData();
    fd.append("security_code", data.security_code);
    fd.append("agent_name", data.agent_name);
    fd.append("agent_phone", data.agent_phone);
    fd.append("store_name", data.store_name);
    
    if (data.description) {
      fd.append("description", data.description);
    }
    
    data.category_ids.forEach((id: string) => {
      fd.append("category_ids[]", id);
    });

    fd.append("owner_name", data.owner_name);
    fd.append("owner_email", data.owner_email);
    fd.append("owner_phone", data.owner_phone);
    
    if (data.country) {
      fd.append("country", data.country);
    }
    fd.append("city", data.city);
    fd.append("address", data.address);
    
    if (data.neighborhood) {
      fd.append("neighborhood", data.neighborhood);
    }

    if (data.lat !== null && data.lng !== null) {
      fd.append("coordinates[lat]", String(data.lat));
      fd.append("coordinates[lng]", String(data.lng));
    }

    if (data.logo) {
      fd.append("logo", data.logo);
    }
    if (data.cover) {
      fd.append("cover", data.cover);
    }

    if (data.payment_provider) {
      fd.append("payment_provider", data.payment_provider);
      if (data.payment_phone) {
        fd.append("payment_phone", data.payment_phone);
      }
      if (data.payment_account_name) {
        fd.append("payment_account_name", data.payment_account_name);
      }
    }

    return api.post<CommercialStoreResponse>("public/commercial/stores", fd);
  }
};
