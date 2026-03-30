/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, Info, Eye, EyeOff, CheckCircle2, Clock, 
  Hourglass, Camera, MapPin, Phone, Mail, FileImage, 
  Map, ShieldCheck 
} from "lucide-react";

type Step = "CODE" | "PERSONAL" | "VERIFY_EMAIL" | "VEHICLE" | "DOCUMENTS" | "PENDING" | "ACTIVE";

export function DriverSignupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("CODE");
  
  // -- Step 1: Code --
  const [code, setCode] = useState("");
  const isValidCode = code.length >= 6; // Mock validation

  // On mount, check if ?ref= is present or ?step=pending
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      setCode(ref.toUpperCase());
    }
    
    const urlStep = searchParams?.get("step");
    if (urlStep === "pending") {
      setStep("PENDING");
    }
  }, [searchParams]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [partnerId, setPartnerId] = useState<number | string>("");

  const handleNextToPersonal = async () => {
    if (!isValidCode) return;
    setIsVerifying(true);
    setCodeError("");
    try {
      const { validateCourierCode } = await import("@/features/auth/service");
      const res = await validateCourierCode(code);
      setAgencyName(res.agency_name);
      setPartnerId(res.partner_id);
      setStep("PERSONAL");
    } catch (error: Error | unknown) {
      setCodeError((error as Error).message || "Code invalide");
    } finally {
      setIsVerifying(false);
    }
  };

  // -- Step 2: Personal Info --
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+226");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");
  
  const hasMinChars = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const [courierId, setCourierId] = useState("");
  const [authToken, setAuthToken] = useState("");

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setRegisterError("Les mots de passe ne correspondent pas");
      return;
    }
    if (!firstName || !lastName || !phone || !email || !password) {
       setRegisterError("Veuillez remplir tous les champs obligatoires");
       return;
    }
    setRegisterError("");
    setIsRegistering(true);

    try {
      const { registerCourier } = await import("@/features/auth/service");
      const payload: Record<string, unknown> = {
        code,
        first_name: firstName,
        last_name: lastName,
        phone: phonePrefix + phone,
        email,
        password,
      };
      if (gender) payload.gender = gender;

      const res = await registerCourier(payload);
      
      // Refresh the session so the app knows we are logged in
      const { getMe } = await import("@/features/auth/service");
      await getMe().catch(() => {});
      
      if ("courier_id" in res && res.courier_id) setCourierId(res.courier_id);
      if ("token" in res && res.token) setAuthToken(res.token);

      if ("email_verification_required" in res && res.email_verification_required) {
        setStep("VERIFY_EMAIL");
      } else {
        setStep("VEHICLE");
      }
    } catch (error: unknown) {
      const err = error as Error & { errors?: Record<string, string[]> };
      if (err.errors && err.errors.email) {
        setRegisterError(err.errors.email[0]);
      } else if (err.errors && err.errors.phone) {
         setRegisterError(err.errors.phone[0]);
      } else {
        setRegisterError(err.message || "Erreur lors de l'inscription");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // -- Step 2.5: Verify Email --
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setOtpError("Veuillez saisir le code à 6 chiffres.");
      return;
    }
    setOtpError("");
    setIsVerifyingOtp(true);
    try {
      const { verifyEmailOtp } = await import("@/features/auth/service");
      await verifyEmailOtp({ identifier: email, code: otpCode, type: 1 });
      setStep("VEHICLE");
    } catch (error: unknown) {
      setOtpError((error as Error).message || "Code invalide ou expiré.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // -- Step 3: Vehicle Info --
  const [vehicleType, setVehicleType] = useState("moto");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [quartier, setQuartier] = useState("");

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleMake || !vehiclePlate || !quartier) {
       setRegisterError("Veuillez remplir les informations de votre véhicule");
       return;
    }
    setRegisterError("");
    setIsRegistering(true);
    try {
      const { updateVehicleCourier } = await import("@/features/auth/service");
      const payload: Record<string, unknown> = {
        vehicle_type: vehicleType,
        vehicle_make: vehicleMake,
        vehicle_plate: vehiclePlate,
        quartier,
      };

      await updateVehicleCourier(payload);
      setStep("DOCUMENTS");
    } catch (error: unknown) {
      setRegisterError((error as Error).message || "Erreur lors de l'enregistrement du véhicule");
    } finally {
      setIsRegistering(false);
    }
  };

  // -- Step 4: Documents --
  const [cniFile, setCniFile] = useState<File | null>(null);
  const [permisFile, setPermisFile] = useState<File | null>(null);
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleUploadDocuments = async () => {
    if (!courierId || !authToken) {
      setStep("PENDING");
      return;
    }
    setIsUploading(true);
    try {
      const { env } = await import("@/lib/env");
      const base = env.NEXT_PUBLIC_API_BASE_URL.endsWith("/")
        ? env.NEXT_PUBLIC_API_BASE_URL
        : `${env.NEXT_PUBLIC_API_BASE_URL}/`;

      const upload = async (file: File, type: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        const fd = new FormData();
        fd.append("files[]", file);
        fd.append("document_type", type);
        fd.append("document_name", type);
        const res = await fetch(`${base}agencies/${partnerId}/couriers/${courierId}/kyc-documents`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: fd,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Upload ${type} failed: ${res.status}`);
      };

      if (cniFile) await upload(cniFile, "id_card");
      if (permisFile) await upload(permisFile, "driver_license");
      if (carteGriseFile) await upload(carteGriseFile, "vehicle_registration");
      setUploadError("");

    } catch (err) {
      console.error(err);
      setUploadError("Certains documents n'ont pas pu être envoyés. Vous pourrez les renvoyer depuis votre espace.");
    } finally {
      setIsUploading(false);
      setStep("PENDING");
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-950 sm:rounded-[2.5rem] sm:border sm:border-gray-200/60 sm:shadow-xl sm:dark:border-gray-800/60 overflow-hidden relative pb-10 sm:pb-0">
      
      {/* ──────────────────────────────────────────────────────────── */}
      {/* ÉTAPE 1 : CODE DE RECRUTEMENT                                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === "CODE" && (
        <div className="animate-fade-in p-5 sm:p-8">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => router.push("/login")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            </button>
            <h1 className="flex-1 text-center pr-9 text-[17px] font-bold text-gray-900 dark:text-white">
              Espace de Candidature
            </h1>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
              Code de Recrutement
            </h2>
            <span className="bg-orange-50/80 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 font-semibold px-3 py-1 text-xs rounded-full">
              Obligatoire
            </span>
          </div>

          <div className="inline-flex items-center gap-2 bg-orange-50/80 dark:bg-orange-500/10 px-3 py-1.5 rounded-full mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-sugu-500"></span>
            <span className="text-xs font-bold text-sugu-600 dark:text-sugu-400">Sécurisé</span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Code de Recrutement
          </h3>
          <p className="text-[15px] text-gray-600 dark:text-gray-400 mb-8 leading-snug">
            Veuillez saisir le code unique fourni par votre agence lors de votre entretien.
          </p>

          <div className={`relative rounded-2xl border-2 transition-all duration-200 mt-2 ${
            codeError ? "border-red-500 bg-red-50/50 dark:bg-red-500/10" : 
            isValidCode ? "border-green-500 bg-green-50/50 dark:bg-green-500/10" : 
            "border-[#f15412] bg-white dark:bg-gray-900 shadow-[0_0_20px_rgba(241,84,18,0.15)]"
          } p-1.5`}>
            <div className="flex items-center justify-between px-3 pt-2">
              <label className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">
                Entrer votre code
              </label>
              {isValidCode && !codeError && (
                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full">
                  Valide
                </span>
              )}
            </div>

            <div className="relative mt-2 p-1.5">
              <div className="absolute top-1/2 -left-4 w-8 h-8 -translate-y-1/2 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 rounded-full flex items-center justify-center">
                <span className="text-sm">🔑</span>
              </div>
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SUGUEXPESS2026"
                className="w-full bg-transparent border-none px-3 py-2 text-xl font-bold text-gray-900 outline-none focus:outline-none focus:ring-0 placeholder:text-gray-300 dark:text-white dark:placeholder:text-gray-700 uppercase tracking-wide"
              />
            </div>
            
            {codeError && (
               <p className="text-red-500 text-sm mt-2 mb-2 text-center font-medium animate-fade-in">{codeError}</p>
            )}
            
            {agencyName && !codeError && (
               <p className="text-green-600 text-sm mt-2 mb-2 text-center font-bold animate-fade-in">Agence certifiée: {agencyName}</p>
            )}
          </div>

          <button
            onClick={handleNextToPersonal}
            disabled={!isValidCode || isVerifying}
            className="w-full mt-8 bg-[#f15412] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 hover:bg-[#d0460c] text-white rounded-3xl py-4 font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
          >
            {isVerifying ? "Vérification..." : <>Continuer <ArrowLeft className="h-5 w-5 rotate-180" /></>}
          </button>

          <div className="mt-8 flex items-center justify-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
            <Info className="h-4 w-4" />
            <span>Vous n'avez pas de code ? Contactez votre agence</span>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ÉTAPE 2 : INFORMATIONS PERSONNELLES                           */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === "PERSONAL" && (
        <div className="animate-fade-in py-5 sm:p-8">
          <div className="px-5">
            <div className="flex items-center mb-6">
              <button 
                onClick={() => setStep("CODE")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors -ml-2"
              >
                <ArrowLeft className="h-5 w-5 text-gray-800 dark:text-gray-200" />
              </button>
              <h1 className="flex-1 text-center pr-9 text-[17px] font-bold text-gray-900 dark:text-white">
                Créer un compte
              </h1>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-[#f15412]">Étape 1 de 2</span>
              <span className="text-xs font-bold text-gray-400">50%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full mb-8 overflow-hidden">
              <div className="h-full bg-[#f15412] rounded-full w-1/2"></div>
            </div>

            {/* Icon & Welcome */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="h-16 w-16 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                {/* Simple moto icon placeholder using tailwind */}
                <div className="text-[#f15412]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 16a2 2 0 1 0 0 4 2 2 0 1 0 0-4Z"/><path d="M19 16a2 2 0 1 0 0 4 2 2 0 1 0 0-4Z"/><path d="m14 8 2.5 2.5"/><path d="M7 6h6l4 4"/><path d="M16 10l-1-2-1-2"/><path d="M7 16V6"/><path d="M2.5 16H5"/><path d="M18 16h3"/></svg>
                </div>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">SUGU Livreur</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[280px]">
                Rejoignez notre réseau de coursiers professionnels et commencez à livrer dès aujourd'hui.
              </p>
            </div>

            {/* Alert */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-4 mb-8 flex gap-3">
              <div className="mt-0.5">
                <Info className="h-5 w-5 text-[#f15412] bg-white dark:bg-gray-900 rounded-full" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Processus d'inscription</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Remplissez vos informations personnelles maintenant. À l'étape suivante, vous ajouterez vos documents et choisirez votre véhicule.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleRegisterUser} className="px-5 space-y-5">
            <h3 className="font-bold text-[15px] text-gray-900 dark:text-white flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-[#f15412]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Informations personnelles
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Nom</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-sugu-500 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Prénom</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-sugu-500 transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Téléphone</label>
              <div className="relative flex">
                <select value={phonePrefix} onChange={(e) => setPhonePrefix(e.target.value)} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-r-0 rounded-l-2xl px-3 py-3.5 text-sm font-semibold text-gray-600 dark:text-gray-400 outline-none focus:border-sugu-500 appearance-none cursor-pointer">
                  <option value="+226">🇧🇫 +226</option>
                  <option value="+225">🇨🇮 +225</option>
                  <option value="+229">🇧🇯 +229</option>
                  <option value="+228">🇹🇬 +228</option>
                  <option value="+223">🇲🇱 +223</option>
                  <option value="+227">🇳🇪 +227</option>
                  <option value="+221">🇸🇳 +221</option>
                </select>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 123 45 67" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-r-2xl px-3 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-sugu-500 transition-colors tracking-wide" />
              </div>
              <p className="text-[11px] text-gray-500 ml-1 mt-1">Ce numéro sera utilisé pour vous contacter</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Genre <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-sugu-500 transition-colors">
                <option value="">— Sélectionner —</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre.email@exemple.com" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-sugu-500 transition-colors" />
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Mot de passe</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères" 
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-sugu-500 transition-colors pr-12" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 h-5 w-5">
                  {showPassword ? <EyeOff className="h-full w-full" /> : <Eye className="h-full w-full" />}
                </button>
              </div>
              {/* password strength */}
              <div className="mt-2 space-y-1.5 ml-1">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${hasMinChars ? 'text-green-500' : 'text-gray-300 dark:text-gray-700'}`} />
                  <span className={hasMinChars ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>Au moins 8 caractères</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${hasUppercase ? 'text-green-500' : 'text-gray-300 dark:text-gray-700'}`} />
                  <span className={hasUppercase ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>Une lettre majuscule</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${hasNumber ? 'text-green-500' : 'text-gray-300 dark:text-gray-700'}`} />
                  <span className={hasNumber ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>Un chiffre</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 mb-8">
              <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Confirmer le mot de passe</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez votre mot de passe" 
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-sugu-500 transition-colors pr-12" 
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 h-5 w-5">
                  {showConfirmPassword ? <EyeOff className="h-full w-full" /> : <Eye className="h-full w-full" />}
                </button>
              </div>
            </div>

            {registerError && (
               <p className="text-red-500 text-sm mt-2 mb-4 text-center font-medium animate-fade-in">{registerError}</p>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full mb-6 bg-[#f15412] active:scale-[0.98] transition-transform hover:bg-[#d0460c] disabled:opacity-50 disabled:active:scale-100 text-white rounded-3xl py-4 font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
            >
              {isRegistering ? "Inscription..." : <>Suivant <ArrowLeft className="h-5 w-5 rotate-180" /></>}
            </button>
          </form>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ÉTAPE : VERIFICATION EMAIL                                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === "VERIFY_EMAIL" && (
        <div className="animate-fade-in py-5 sm:p-8">
          <div className="px-5">
            <div className="flex items-center justify-center mb-6">
              <h1 className="text-center text-[17px] font-bold text-gray-900 dark:text-white">
                Vérification de l&apos;email
              </h1>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-4 mb-6 flex gap-3">
              <div className="mt-0.5">
                <Mail className="h-5 w-5 text-[#f15412]" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Code envoyé !</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Un email avec un code de vérification à 6 chiffres a été envoyé à <strong>{email}</strong>.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleVerifyEmail} className="px-5 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Code de confirmation</label>
              <input 
                type="text" 
                maxLength={6}
                value={otpCode} 
                onChange={(e) => setOtpCode(e.target.value)} 
                placeholder="000000" 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-center text-lg tracking-widest font-bold outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-sugu-500 transition-colors" 
              />
            </div>

            {otpError && (
               <p className="text-red-500 text-sm mt-2 mb-4 text-center font-medium animate-fade-in">{otpError}</p>
            )}

            <button
              type="submit"
              disabled={isVerifyingOtp}
              className="w-full mt-4 mb-6 bg-[#f15412] active:scale-[0.98] transition-transform hover:bg-[#d0460c] disabled:opacity-50 disabled:active:scale-100 text-white rounded-3xl py-4 font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
            >
              {isVerifyingOtp ? "Vérification..." : "Vérifier l'email"}
            </button>
          </form>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ÉTAPE 3 : VÉHICULE                                           */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === "VEHICLE" && (
        <div className="animate-fade-in py-5 sm:p-8">
          <div className="px-5">
            <div className="flex items-center mb-6">
              <button 
                onClick={() => setStep("PERSONAL")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors -ml-2"
              >
                <ArrowLeft className="h-5 w-5 text-gray-800 dark:text-gray-200" />
              </button>
              <h1 className="flex-1 text-center pr-9 text-[17px] font-bold text-gray-900 dark:text-white">
                Véhicule
              </h1>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-[#f15412]">Étape 2 de 3</span>
              <span className="text-xs font-bold text-gray-400">75%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full mb-8 overflow-hidden">
              <div className="h-full bg-[#f15412] rounded-full w-[75%]"></div>
            </div>
          </div>

          <form onSubmit={handleSaveVehicle} className="px-5 space-y-5">
            <h3 className="font-bold text-[15px] text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="text-[#f15412] h-5 w-5" />
              Zone de travail
            </h3>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Quartier Principal</label>
              <input type="text" value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Ex: Akpakpa, Plateau..." className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-sugu-500 transition-colors" />
            </div>

            <h3 className="font-bold text-[15px] text-gray-900 dark:text-white flex items-center gap-2 mt-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-[#f15412]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 17-7 4-7-4"/><path d="m19 12-7 4-7-4"/><path d="M12 2 5 6l7 4 7-4-7-4Z"/></svg>
              Détails du véhicule
            </h3>

            <div className="space-y-3">
              <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Type de véhicule</label>
              <div className="flex gap-2">
                {['moto', 'velo', 'voiture'].map(type => (
                  <button 
                    key={type}
                    type="button" 
                    onClick={() => setVehicleType(type)}
                    className={`flex-1 py-3 rounded-2xl border ${vehicleType === type ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 font-bold' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500'} transition-all`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Marque</label>
                <input type="text" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} placeholder="KTM 125..." className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-sugu-500 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1">Plaque</label>
                <input type="text" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="0124-MD" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-sugu-500 transition-colors uppercase" />
              </div>
            </div>

            {registerError && (
               <p className="text-red-500 text-sm mt-2 mb-4 text-center font-medium animate-fade-in">{registerError}</p>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full mt-4 mb-6 bg-[#f15412] active:scale-[0.98] transition-transform hover:bg-[#d0460c] disabled:opacity-50 disabled:active:scale-100 text-white rounded-3xl py-4 font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
            >
              {isRegistering ? "Enregistrement..." : <>Suivant <ArrowLeft className="h-5 w-5 rotate-180" /></>}
            </button>
          </form>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ÉTAPE 4 : DOCUMENTS KYC                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === "DOCUMENTS" && (
        <div className="animate-fade-in py-5 sm:p-8">
          <div className="px-5">
            <div className="flex items-center justify-center mb-6">
              <h1 className="text-center text-[17px] font-bold text-gray-900 dark:text-white">
                Documents justificatifs
              </h1>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-[#f15412]">Étape 3 de 3</span>
              <span className="text-xs font-bold text-gray-400">100%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full mb-8 overflow-hidden">
              <div className="h-full bg-[#f15412] rounded-full w-[100%]"></div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-4 mb-6 flex gap-3">
              <div className="mt-0.5">
                <Info className="h-5 w-5 text-[#f15412] bg-white dark:bg-gray-900 rounded-full" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Ultime étape !</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Votre compte est créé. Ajoutez maintenant vos pièces pour permettre à votre agence de valider rapidement votre profil.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 space-y-4">
            {/* CNI */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-[14px]">
                  <FileImage className="text-gray-400 h-5 w-5" />
                  Pièce d'identité (CNI / Passeport) <span className="text-red-500">*</span>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                onChange={(e) => setCniFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
              />
            </div>

            {/* Permis */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-[14px]">
                  <FileImage className="text-gray-400 h-5 w-5" />
                  Permis de conduire <span className="text-red-500">*</span>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                onChange={(e) => setPermisFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
              />
            </div>

            {/* Carte Grise */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-[14px]">
                  <FileImage className="text-gray-400 h-5 w-5" />
                  Carte Grise
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                onChange={(e) => setCarteGriseFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200"
              />
            </div>

            <button
              onClick={handleUploadDocuments}
              disabled={isUploading || !cniFile || !permisFile}
              className="w-full mt-6 bg-[#f15412] active:scale-[0.98] transition-transform hover:bg-[#d0460c] disabled:opacity-50 disabled:active:scale-100 text-white rounded-3xl py-4 font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
            >
              {isUploading ? "Envoi en cours..." : "Terminer et Soumettre"}
            </button>

            {uploadError && (
              <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
                ⚠️ {uploadError}
              </div>
            )}

            <div className="text-center mt-4">
              <button 
                onClick={() => setStep("PENDING")}
                className="text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-[#f15412]"
              >
                Passer et envoyer plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ÉTAPE 3 : PENDING VALIDATION                                */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === "PENDING" && (
        <div className="animate-fade-in p-5 sm:p-8">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => router.push("/login")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors -ml-2"
            >
              <ArrowLeft className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            </button>
            <h1 className="flex-1 text-center pr-9 text-[17px] font-bold text-gray-900 dark:text-white">
              Validation en attente
            </h1>
            <button onClick={() => setStep("ACTIVE")} className="text-xs text-gray-400 underline" title="Dev only: jump to active">skip</button>
          </div>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-24 w-24 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center relative mb-4">
              <Clock className="h-10 w-10 text-[#f15412]" strokeWidth={2.5} />
              <div className="absolute top-0 right-0 h-6 w-6 bg-[#f15412] rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950">
                <span className="text-white text-xs tracking-widest leading-none font-bold mt-[-2px]">...</span>
              </div>
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 max-w-[200px] leading-tight">
              Compte en attente de validation
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[280px]">
              Votre compte doit être validé par votre agence de livraison avant de pouvoir accepter des courses.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex gap-3 shadow-sm shadow-orange-100/50 mb-8">
            <Info className="h-5 w-5 flex-shrink-0 text-[#f15412]" />
            <div>
              <p className="text-xs font-bold text-[#f15412] uppercase tracking-wide">Temps de validation estimé</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">24 à 48 heures ouvrées</p>
            </div>
          </div>

          <h3 className="font-bold text-[16px] text-gray-900 dark:text-white mb-4">Statut de vérification</h3>
          
          <div className="space-y-3 mb-8">
            {/* Item 1 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex gap-4">
                <div className="h-10 w-10 flex-shrink-0 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">Email confirmé</h4>
                    <span className="bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full text-[10px] font-bold">Validé</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-2">Votre adresse email a été vérifiée avec succès.</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Validé il y a 2 heures</p>
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex gap-4">
                <div className="h-10 w-10 flex-shrink-0 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">Pièce d'identité</h4>
                    <span className="bg-white border border-orange-200 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold">En cours</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">Votre pièce d'identité est en cours de vérification par l'agence.</p>
                  <div className="border border-orange-200 flex items-center gap-2 rounded-xl p-2 bg-white">
                    <div className="bg-orange-100 p-1.5 rounded-lg"><FileImage className="h-3.5 w-3.5 text-orange-600" /></div>
                    <span className="text-xs font-bold text-gray-700">CNI-123456789.jpg</span>
                  </div>
                </div>
              </div>
            </div>

             {/* Item 3 */}
             <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex gap-4">
                <div className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-full flex items-center justify-center">
                  <Hourglass className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">Carte grise du véhicule</h4>
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200">En attente</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">Document optionnel mais recommandé pour certaines livraisons.</p>
                  <button className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors hover:bg-gray-200">
                    <Camera className="h-4 w-4" /> Prendre une photo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <h3 className="font-bold text-[16px] text-gray-900 dark:text-white mb-4">Votre agence</h3>
          
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-[#f15412] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/><path d="M5 11V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><rect x="10" y="15" width="4" height="6"/><path d="M9 7h1"/><path d="M14 7h1"/></svg>
              </div>
              <div>
                <h4 className="font-bold text-[15px] text-gray-900 dark:text-white">Sugu Express</h4>
                <p className="text-xs font-semibold text-gray-500">Agence partenaire SUGU</p>
              </div>
            </div>
            
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" /> Plateau, Avenue Pompidou, Dakar
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" /> +226 33 823 45 67
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" /> contact@expresslivraison.sn
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ÉTAPE 4 : ACTIVE (COMPTE VALIDE)                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === "ACTIVE" && (
        <div className="animate-fade-in p-5 sm:p-8">
          <div className="flex flex-col items-center text-center mt-6 mb-8">
            <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center relative mb-6">
              <div className="h-14 w-14 border-[3px] border-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-[22px] font-black text-gray-900 dark:text-white mb-3 leading-tight">
              Compte validé !
            </h2>
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-600 font-bold px-3 py-1 rounded-full text-xs">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div> Actif
            </div>
            <p className="text-[13px] text-gray-600 dark:text-gray-400 max-w-[280px] mt-4 font-medium">
              Félicitations ! Votre compte coursier a été validé par votre agence.
            </p>
          </div>

          <div className="bg-[#f15412] text-white rounded-[1.25rem] overflow-hidden mb-8 shadow-md">
            <div className="p-4 border-b border-white/20 flex gap-3 items-center bg-white/10">
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wide">Statut du compte</p>
                <p className="text-sm font-bold">Validé et actif</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-green-600 text-[10px] font-bold">✓</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Email vérifié</p>
                  <p className="text-[11px] text-gray-500">Votre adresse email a été confirmée</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                   <span className="text-green-600 text-[10px] font-bold">✓</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Documents validés</p>
                  <p className="text-[11px] text-gray-500">Pièce d'identité et permis approuvés</p>
                </div>
              </div>
            </div>
          </div>

          <h3 className="font-bold text-[16px] text-gray-900 dark:text-white mb-4">Conseils pour démarrer</h3>
          
          <div className="grid grid-cols-1 gap-3 mb-8">
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-3 flex gap-3 shadow-sm bg-white dark:bg-gray-900">
              <div className="h-8 w-8 bg-orange-50 text-[#f15412] rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Gardez l'app ouverte</p>
                <p className="text-[10px] text-gray-500">Recevez les notifications...</p>
              </div>
            </div>
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-3 flex gap-3 shadow-sm bg-white dark:bg-gray-900">
              <div className="h-8 w-8 bg-orange-50 text-[#f15412] rounded-full flex items-center justify-center flex-shrink-0">
                <Map className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Vérifiez les adresses</p>
                <p className="text-[10px] text-gray-500">Confirmez toujours l'adresse avant...</p>
              </div>
            </div>
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-3 flex gap-3 shadow-sm bg-white dark:bg-gray-900">
              <div className="h-8 w-8 bg-orange-50 text-[#f15412] rounded-full flex items-center justify-center flex-shrink-0">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Prenez des preuves</p>
                <p className="text-[10px] text-gray-500">Photographiez chaque livraison...</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-4 mb-8">
            <div className="flex gap-2 mb-3">
               <ShieldCheck className="h-5 w-5 text-red-500" />
               <p className="text-sm font-bold text-gray-900 dark:text-white">Consignes de sécurité</p>
            </div>
            <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-2 pl-2">
              <li className="flex gap-2">
                <span className="text-red-500 font-bold">✓</span>
                Portez toujours votre casque et équipements
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 font-bold">✓</span>
                Respectez le code de la route
              </li>
              <li className="flex gap-2">
                 <span className="text-red-500 font-bold">✓</span>
                Ne partagez jamais vos codes d'accès
              </li>
            </ul>
          </div>

          <button
            onClick={() => router.push("/driver/dashboard")}
            className="w-full bg-[#f15412] active:scale-[0.98] transition-transform hover:bg-[#d0460c] text-white rounded-3xl py-4 font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
          >
            Accéder à mes livraisons <ArrowLeft className="h-5 w-5 rotate-180" />
          </button>
        </div>
      )}

    </div>
  );
}
