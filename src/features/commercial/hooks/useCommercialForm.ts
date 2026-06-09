import { useState } from "react";
import { commercialApi } from "../api/commercial.api";
import type { CommercialFormData } from "../types/commercial.types";
import { ApiError } from "@/lib/http/api-error";

const DEFAULT_FORM_DATA: CommercialFormData = {
  agent_name: "",
  agent_phone: "",
  store_name: "",
  description: "",
  category_ids: [],
  owner_name: "",
  owner_email: "",
  owner_phone: "",
  country: "BF",
  city: "",
  address: "",
  neighborhood: "",
  lat: null,
  lng: null,
  logo: null,
  cover: null,
  payment_provider: "",
  payment_phone: "",
  payment_account_name: "",
  security_code: "",
};

const ERROR_MESSAGES: Record<string, string> = {
  'COMMERCIAL_FORM_DISABLED': 'Le formulaire d\'inscription est temporairement désactivé.',
  'INVALID_SECURITY_CODE': 'Le code de sécurité est invalide. Veuillez vérifier auprès de votre superviseur.',
  'COMMERCIAL_RATE_LIMIT_IP': 'Trop de tentatives depuis votre adresse IP. Veuillez réessayer dans une heure.',
  'COMMERCIAL_RATE_LIMIT_DAILY': 'Le nombre maximum de soumissions quotidiennes a été atteint.',
  'COMMERCIAL_DUPLICATE_EMAIL': 'Un compte utilisateur avec cet email existe déjà.',
  'STORE_DUPLICATE_SLUG': 'Une boutique avec ce nom existe déjà.',
};

export function useCommercialForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CommercialFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const setField = (key: keyof CommercialFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.agent_name.trim()) {
        newErrors.agent_name = "Le nom du commercial est obligatoire.";
      } else if (formData.agent_name.trim().length < 2) {
        newErrors.agent_name = "Le nom doit contenir au moins 2 caractères.";
      }
      
      const phoneRegex = /^\+?[0-9]{8,15}$/;
      if (!formData.agent_phone.trim()) {
        newErrors.agent_phone = "Le numéro de téléphone est obligatoire.";
      } else if (!phoneRegex.test(formData.agent_phone.trim().replace(/\s/g, ""))) {
        newErrors.agent_phone = "Le format du numéro de téléphone n'est pas valide.";
      }
    }

    if (step === 2) {
      if (!formData.store_name.trim()) {
        newErrors.store_name = "Le nom de la boutique est obligatoire.";
      } else if (formData.store_name.trim().length < 2) {
        newErrors.store_name = "Le nom doit contenir au moins 2 caractères.";
      }
      
      if (formData.category_ids.length === 0) {
        newErrors.category_ids = "Veuillez sélectionner au moins une catégorie.";
      }
    }

    if (step === 3) {
      if (!formData.owner_name.trim()) {
        newErrors.owner_name = "Le nom du vendeur est obligatoire.";
      } else if (formData.owner_name.trim().length < 2) {
        newErrors.owner_name = "Le nom doit contenir au moins 2 caractères.";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.owner_email.trim()) {
        newErrors.owner_email = "L'adresse email est obligatoire.";
      } else if (!emailRegex.test(formData.owner_email.trim())) {
        newErrors.owner_email = "L'adresse email n'est pas valide.";
      }

      const phoneRegex = /^\+?[0-9]{8,15}$/;
      if (!formData.owner_phone.trim()) {
        newErrors.owner_phone = "Le numéro de téléphone est obligatoire.";
      } else if (!phoneRegex.test(formData.owner_phone.trim().replace(/\s/g, ""))) {
        newErrors.owner_phone = "Le format du numéro de téléphone n'est pas valide.";
      }
    }

    if (step === 4) {
      if (!formData.city.trim()) {
        newErrors.city = "La ville est obligatoire.";
      }
      if (!formData.address.trim()) {
        newErrors.address = "L'adresse est obligatoire.";
      }
    }

    if (step === 5) {
      if (!formData.security_code.trim()) {
        newErrors.security_code = "Le code de sécurité est obligatoire.";
      } else if (formData.security_code.trim().length < 10) {
        newErrors.security_code = "Le code de sécurité doit contenir au moins 10 caractères.";
      }

      if (formData.payment_provider) {
        const phoneRegex = /^\+?[0-9]{8,15}$/;
        if (formData.payment_provider !== "bank" && !formData.payment_phone.trim()) {
          newErrors.payment_phone = "Le numéro de téléphone pour le paiement mobile est requis.";
        } else if (formData.payment_phone.trim() && !phoneRegex.test(formData.payment_phone.trim().replace(/\s/g, ""))) {
          newErrors.payment_phone = "Le format du numéro n'est pas valide.";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      return true;
    }
    return false;
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    } else {
      // Validate all intermediate steps
      for (let s = currentStep; s < step; s++) {
        if (!validateStep(s)) return;
      }
      setCurrentStep(step);
    }
  };

  const submit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await commercialApi.submitStore(formData);
      if (res.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(res.message || "Une erreur est survenue lors de l'envoi.");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const mappedMsg = ERROR_MESSAGES[err.code] || err.message;
        setSubmitError(mappedMsg);
        
        // Handle validation errors from backend if any
        if (err.errors) {
          const backendErrors: Record<string, string> = {};
          Object.entries(err.errors).forEach(([key, val]) => {
            if (Array.isArray(val) && val.length > 0) {
              backendErrors[key] = val[0];
            }
          });
          setErrors(backendErrors);
        }
      } else {
        setSubmitError("Impossible de contacter le serveur. Veuillez vérifier votre connexion.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setCurrentStep(1);
  };

  return {
    currentStep,
    totalSteps: 5,
    formData,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    setField,
    nextStep,
    prevStep,
    goToStep,
    submit,
    reset,
  };
}
