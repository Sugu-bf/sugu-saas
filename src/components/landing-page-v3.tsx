"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, useLogout } from "@/features/auth/hooks";
import {
  ArrowLeft,
  User,
  Store,
  Shirt,
  Hash,
  MapPin,
  Locate,
  MessageCircle,
  Mail,
  Globe,
  Briefcase,
} from "lucide-react";

export function LandingPageV3() {
  const [activeTab, setActiveTab] = useState<"orders" | "delivery" | "money" | "signal">("orders");
  const [currentFlow, setCurrentFlow] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal and Seller Form States
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isSellerSubmitted, setIsSellerSubmitted] = useState(false);
  const [isSellerLoading, setIsSellerLoading] = useState(false);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [sellerData, setSellerData] = useState({
    fullName: "",
    storeName: "",
    companyProfile: "",
    salesChannel: "",
    productCount: "",
    country: "",
    city: "",
    neighborhood: "",
    phone: "",
    email: "",
    description: "",
    hasPhotos: false,
    hasRCCM: false,
    useLocation: false,
  });

  const { data: user } = useSession();
  const logoutMutation = useLogout();

  let dashboardUrl = "/vendor/dashboard";
  if (user) {
    if (user.role === "vendor") {
      dashboardUrl = "/vendor/dashboard";
    } else if (user.role === "agency") {
      dashboardUrl = "/agency/dashboard";
    } else if (user.role === "courier") {
      if (user.courier_status === 4) {
        dashboardUrl = "/signup/driver?step=pending";
      } else {
        dashboardUrl = "/driver/dashboard";
      }
    }
  }


  const progressRef = useRef<HTMLDivElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const routeCanvasRef = useRef<HTMLCanvasElement>(null);
  const finalCanvasRef = useRef<HTMLCanvasElement>(null);
  const flowSectionRef = useRef<HTMLElement>(null);

  const COUNTRY_CODES: Record<string, string> = {
    BF: "+226",
    CI: "+225",
    SN: "+221",
    ML: "+223",
    TG: "+228",
    BJ: "+229",
    NE: "+227",
    GW: "+245",
  };

  // Flow items data
  const flowData = [
    {
      title: "Commande reçue",
      badge: "01",
      action: "Confirmer la commande",
      copy: "Le vendeur voit le produit, le client et la ville. Rien ne commence dans le flou.",
      signal: "client identifié",
      result: "La vente existe déjà dans le système.",
      bar: "25%",
    },
    {
      title: "Commande préparée",
      badge: "02",
      action: "Préparer le colis",
      copy: "Le stock est confirmé. L'équipe sait quoi faire avant la livraison.",
      signal: "stock confirmé",
      result: "Le vendeur ne cherche plus l'information.",
      bar: "50%",
    },
    {
      title: "Commande en route",
      badge: "03",
      action: "Suivre le livreur",
      copy: "La livraison avance avec un statut clair. Le client n'est plus laissé dans le silence.",
      signal: "livreur actif",
      result: "La confiance avance avec le colis.",
      bar: "76%",
    },
    {
      title: "Commande payée",
      badge: "04",
      action: "Voir le revenu",
      copy: "Paiement, commission et historique restent visibles dans le même fil.",
      signal: "revenu suivi",
      result: "La vente se termine sans brouillard.",
      bar: "100%",
    },
  ];

  // Helper to draw animated lines in canvases
  const drawLines = (canvas: HTMLCanvasElement | null, palette = ["#F15412", "#C9F2E2"]) => {
    if (!canvas) return () => {};
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    let width = 0;
    let height = 0;
    let tick = 0;
    let animationFrameId: number;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      if (canvas.clientWidth !== width || canvas.clientHeight !== height) resize();
      tick += 0.006;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < 18; i++) {
        const y = (height * (i + 1)) / 20;
        const start = -120 + ((tick * 280 + i * 57) % (width + 240));
        const grad = ctx.createLinearGradient(start, y, start + 220, y);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.45, palette[i % palette.length]);
        grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad;
        ctx.lineWidth = i % 3 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(start, y);
        ctx.bezierCurveTo(start + 70, y - 35, start + 140, y + 35, start + 220, y);
        ctx.stroke();
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  };

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      setSellerData((prev) => ({ ...prev, useLocation: true, city: "Recherche en cours..." }));
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await res.json();
            const detectedCountry = data.address?.country_code?.toUpperCase();

            setSellerData((prev) => ({
              ...prev,
              ...(detectedCountry && COUNTRY_CODES[detectedCountry] ? { country: detectedCountry } : {}),
              city: data.address?.city || data.address?.town || data.address?.state || "Inconnue",
              neighborhood: data.address?.suburb || data.address?.neighbourhood || "",
            }));
          } catch (e) {
            setSellerData((prev) => ({ ...prev, city: "Erreur GPS", neighborhood: "" }));
          }
        },
        () => {
          setSellerData((prev) => ({ ...prev, city: "GPS Refusé", useLocation: false }));
        }
      );
    }
  };

  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSellerLoading(true);
    setSellerError(null);

    try {
      const res = await fetch("/api/prelaunch/seller-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sellerData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Une erreur est survenue.");
      }

      setIsSellerSubmitted(true);
    } catch (err: any) {
      setSellerError(err.message);
    } finally {
      setIsSellerLoading(false);
    }
  };

  useEffect(() => {
    // 1. Add class has-js to HTML element
    document.documentElement.classList.add("has-js");

    // 2. Setup scroll progress tracking
    const onScroll = () => {
      if (!progressRef.current) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max <= 0 ? 0 : Math.max(0, Math.min(1, window.scrollY / max)) * 100;
      progressRef.current.style.width = `${progress}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // 3. Initialize canvas animations
    const cleanHero = drawLines(heroCanvasRef.current, ["#F15412", "#C9F2E2"]);
    const cleanRoute = drawLines(routeCanvasRef.current, ["#F15412", "#0E6B57"]);
    const cleanFinal = drawLines(finalCanvasRef.current, ["#F15412", "#C9F2E2"]);

    // 4. Reveal element observer
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.18 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

    // 5. Scroll-linked flow steps selection
    const updateFlowFromScroll = () => {
      if (!flowSectionRef.current) return;
      const rect = flowSectionRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.62 - rect.top) / rect.height));
      setCurrentFlow(Math.min(3, Math.floor(progress * 4)));
    };
    window.addEventListener("scroll", updateFlowFromScroll, { passive: true });
    window.addEventListener("resize", updateFlowFromScroll);
    updateFlowFromScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", updateFlowFromScroll);
      window.removeEventListener("resize", updateFlowFromScroll);
      cleanHero();
      cleanRoute();
      cleanFinal();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <div className="text-white bg-night antialiased font-sans select-none overflow-x-hidden">
      {/* Dynamic isolated styles matching the original sugupro-v3.html */}
      <style dangerouslySetInnerHTML={{ __html: `
        html {
          scroll-behavior: smooth;
        }

        body {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          letter-spacing: 0;
          background: #07111f;
        }

        .stage {
          background:
            radial-gradient(circle at 72% 18%, rgba(241, 84, 18, 0.24), transparent 27rem),
            radial-gradient(circle at 13% 82%, rgba(14, 107, 87, 0.22), transparent 30rem),
            linear-gradient(90deg, rgba(7, 17, 31, 0.95), rgba(7, 17, 31, 0.74) 42%, rgba(7, 17, 31, 0.28)),
            url("https://cdn.sugu.pro/p/sugupro/sugupro-hero-seller.webp");
          background-size: cover;
          background-position: center right;
        }

        .grain::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.08;
          mix-blend-mode: overlay;
          background-image:
            linear-gradient(0deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 42px 42px;
        }

        .reveal {
          opacity: 1;
          transform: none;
        }

        .has-js .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 800ms ease, transform 800ms ease;
        }

        .has-js .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .flow-step {
          opacity: 0.42;
          transform: translateX(0);
          transition: opacity 300ms ease, transform 300ms ease, border-color 300ms ease, background 300ms ease;
        }

        .flow-step.is-active {
          opacity: 1;
          transform: translateX(8px);
          border-color: rgba(241, 84, 18, 0.65);
          background: rgba(255, 255, 255, 0.08);
        }

        .dash-panel {
          display: none;
        }

        .dash-panel.is-active {
          display: grid;
        }

        .dash-tab.is-active {
          background: #101828;
          color: #fff;
        }

        .pulse {
          animation: pulseGlow 2.4s ease-in-out infinite;
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(241,84,18,0); }
          50% { box-shadow: 0 0 38px rgba(241,84,18,.35); }
        }

        .marquee {
          animation: marquee 26s linear infinite;
        }

        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @media (max-width: 767px) {
          .stage {
            background:
              linear-gradient(180deg, rgba(7, 17, 31, 0.96), rgba(7, 17, 31, 0.76) 54%, rgba(7, 17, 31, 0.3)),
              url("https://cdn.sugu.pro/p/sugupro/sugupro-hero-seller-mobile.webp");
            background-size: cover;
            background-position: center bottom;
          }

          .flow-step.is-active {
            transform: translateX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
          }
          .reveal {
            opacity: 1;
            transform: none;
          }
        }

        /* ════════════════════════════════════════════════════════
           MODERN DARK GLASS SELLER MODAL
           ════════════════════════════════════════════════════════ */
        .modalOverlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(7, 17, 31, 0.65);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modalContent {
          background: rgba(10, 18, 30, 0.95);
          width: 100%;
          max-width: 500px;
          max-height: 85vh;
          border-radius: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow: 0 32px 90px rgba(7, 17, 31, 0.6), 0 0 40px rgba(241, 84, 18, 0.08);
          animation: modalScaleUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .modalContent::-webkit-scrollbar {
          width: 5px;
        }
        .modalContent::-webkit-scrollbar-track {
          background: transparent;
          margin: 18px 0;
        }
        .modalContent::-webkit-scrollbar-thumb {
          background: rgba(241, 84, 18, 0.4);
          border-radius: 99px;
        }
        .modalContent::-webkit-scrollbar-thumb:hover {
          background: rgba(241, 84, 18, 0.7);
        }

        @keyframes modalScaleUp {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }

        .modalHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px 12px;
          position: sticky;
          top: 0;
          background: rgba(10, 18, 30, 0.98);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 10;
        }

        .modalBackBtn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px;
          margin-left: -8px;
          cursor: pointer;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
        }

        .modalBackBtn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateX(-2px);
        }

        .modalTitle {
          font-size: 20px;
          font-weight: 900;
          color: #fff;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .modalHero {
          display: flex;
          justify-content: center;
          padding: 16px 0 16px;
          background: radial-gradient(circle at center, rgba(241, 84, 18, 0.08) 0%, transparent 70%);
        }

        .modalHeroIllustration {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 0;
          filter: drop-shadow(0 8px 24px rgba(241, 84, 18, 0.18));
        }

        .modalHeroImg {
          object-fit: contain;
          transition: transform 0.5s ease;
        }
        
        .modalHeroIllustration:hover .modalHeroImg {
          transform: scale(1.05) translateY(-4px);
        }

        .sForm {
          padding: 12px 28px 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sInputWrap {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 0 18px;
          transition: all 0.25s ease;
        }

        .sInputWrap:focus-within {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(241, 84, 18, 0.65);
          box-shadow: 0 0 18px rgba(241, 84, 18, 0.18);
        }

        .sInputIcon {
          color: rgba(255, 255, 255, 0.38);
          margin-right: 14px;
          flex-shrink: 0;
          transition: color 0.25s ease;
        }

        .sInputWrap:focus-within .sInputIcon {
          color: #f15412;
        }

        .sInput {
          flex: 1;
          background: transparent;
          border: none;
          padding: 16px 0;
          font-family: inherit;
          font-size: 15px;
          color: #fff;
          outline: none;
        }

        .sInput::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        
        select.sInput option {
          background-color: #07111f;
          color: #fff;
        }

        .sInputWrapTextarea {
          align-items: flex-start;
          padding-top: 14px;
          padding-bottom: 14px;
        }

        .sTextarea {
          resize: none;
          padding: 0;
          line-height: 1.6;
        }

        .sCheckGroup {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 8px;
        }

        .sCheckLabel {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.72);
          cursor: pointer;
          line-height: 1.5;
          transition: color 0.2s ease;
        }
        
        .sCheckLabel:hover {
          color: #fff;
        }

        .sCheck {
          width: 18px;
          height: 18px;
          accent-color: #f15412;
          cursor: pointer;
          flex-shrink: 0;
          margin-top: 2px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }

        .sFooterNote {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
          text-align: left;
          margin: 10px 0 2px;
          line-height: 1.4;
        }

        .sSubmitBtn {
          background: #f15412;
          color: #fff;
          border: none;
          padding: 16px;
          border-radius: 99px;
          font-weight: 900;
          font-size: 16px;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 0 30px rgba(241, 84, 18, 0.24);
          transition: all 0.25s ease;
        }

        .sSubmitBtn:hover:not(:disabled) {
          background: #d43d0a;
          transform: translateY(-2px);
          box-shadow: 0 0 35px rgba(241, 84, 18, 0.42);
        }

        .sSubmitBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sBtnGpsWrap {
          display: flex;
          justify-content: flex-end;
          margin-top: -6px;
        }

        .sBtnGps {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 14px;
          border-radius: 99px;
          font-size: 13px;
          font-family: inherit;
          font-weight: 700;
          color: #f15412;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .sBtnGps:hover {
          background: rgba(241, 84, 18, 0.1);
          border-color: rgba(241, 84, 18, 0.3);
          transform: translateY(-1px);
        }

        .sPhonePrefix {
          font-weight: 700;
          color: #f15412;
          font-size: 15px;
          margin-right: 10px;
          padding-right: 10px;
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
        }

        .formErrorMessage {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.24);
          border-left: 4px solid #ef4444;
          color: #fca5a5;
          padding: 14px 18px;
          font-size: 14px;
          border-radius: 12px;
          margin-bottom: 8px;
          animation: csFadeIn 0.3s ease-out;
        }

        .successBox {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 10px;
          animation: csFadeIn 0.5s ease-out forwards;
        }

        .successIcon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #f15412;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(241, 84, 18, 0.25);
        }

        .successTitle {
          font-family: inherit;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
        }

        .successSub {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.5;
        }
      ` }} />

      <div id="top"></div>
      
      {/* Scroll Progress Indicator */}
      <div className="fixed left-0 top-0 z-[70] h-1 w-full bg-white/10">
        <div ref={progressRef} id="progress" className="h-full w-0 bg-clay transition-all duration-75"></div>
      </div>

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-night/72 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Navigation principale">
          <a href="#top" className="flex items-baseline gap-0.5" aria-label="SUGUPro">
            <span className="text-2xl font-black tracking-[-0.04em]">SUGU</span>
            <span className="text-xs font-black text-clay">Pro</span>
          </a>

          <div className="hidden items-center gap-7 text-sm font-bold text-white/72 lg:flex">
            <a className="hover:text-white" href="#flow">Fil</a>
            <a className="hover:text-white" href="#cockpit">Cockpit</a>
            <a className="hover:text-white" href="#terrain">Terrain</a>
            <a className="hover:text-white" href="#questions">Questions</a>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="text-sm font-bold text-white/72 hover:text-white bg-transparent border-none cursor-pointer outline-none"
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Déconnexion..." : "Déconnexion"}
                </button>
                <Link
                  href={dashboardUrl}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-night transition hover:bg-mint no-underline"
                >
                  Mon Espace
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-bold text-white/72 hover:text-white bg-transparent border-none cursor-pointer outline-none no-underline"
                >
                  Connexion
                </Link>
                <button
                  onClick={() => setIsSellerModalOpen(true)}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-night transition hover:bg-mint cursor-pointer"
                >
                  Ouvrir SUGUPro
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 lg:hidden"
            type="button"
            aria-label="Ouvrir le menu"
            aria-controls="mobileNav"
            aria-expanded={mobileMenuOpen}
          >
            <span className="h-0.5 w-5 bg-white"></span>
          </button>
        </nav>

        {/* Mobile Navigation */}
        <div id="mobileNav" className={`${mobileMenuOpen ? "block" : "hidden"} border-t border-white/10 bg-night px-4 py-4 lg:hidden`}>
          <div className="grid gap-2 text-base font-bold">
            <a className="rounded-xl px-4 py-3 hover:bg-white/10" href="#flow" onClick={() => setMobileMenuOpen(false)}>Fil</a>
            <a className="rounded-xl px-4 py-3 hover:bg-white/10" href="#cockpit" onClick={() => setMobileMenuOpen(false)}>Cockpit</a>
            <a className="rounded-xl px-4 py-3 hover:bg-white/10" href="#terrain" onClick={() => setMobileMenuOpen(false)}>Terrain</a>
            <a className="rounded-xl px-4 py-3 hover:bg-white/10" href="#questions" onClick={() => setMobileMenuOpen(false)}>Questions</a>
            {user ? (
              <>
                <Link
                  href={dashboardUrl}
                  className="rounded-xl px-4 py-3 hover:bg-white/10 text-white font-bold no-underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mon Espace
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logoutMutation.mutate();
                  }}
                  className="w-full text-left rounded-xl px-4 py-3 hover:bg-white/10 text-white/72 hover:text-white bg-transparent border-none font-bold cursor-pointer"
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Déconnexion..." : "Déconnexion"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-4 py-3 hover:bg-white/10 text-white font-bold no-underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Connexion
                </Link>
                <button
                  className="mt-2 rounded-full bg-white px-5 py-3 text-center font-black text-night cursor-pointer"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsSellerModalOpen(true);
                  }}
                >
                  Ouvrir SUGUPro
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="stage grain relative flex min-h-[92svh] items-end overflow-hidden pt-28">
          <canvas ref={heroCanvasRef} id="heroCanvas" className="absolute inset-0 h-full w-full opacity-80 pointer-events-none"></canvas>

          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 pb-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-16">
            <div className="max-w-4xl">
              <p className="reveal mb-5 max-w-lg text-lg font-black text-orange-100 sm:text-2xl">
                Le commerce africain n'attend personne.
              </p>
              <h1 className="reveal text-[clamp(3.2rem,8vw,8.8rem)] leading-[0.9] tracking-[-0.045em] font-black">
                Chaque commande doit avancer.
              </h1>
              <p className="reveal mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/82 sm:text-2xl sm:leading-9">
                SUGUPro relie boutique, livraison, paiement et revenus. Un seul fil. Zéro flou.
              </p>
              
              <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row">
                {user ? (
                  <Link
                    href={dashboardUrl}
                    className="group inline-flex items-center justify-center rounded-full bg-clay px-7 py-4 text-base font-black text-white shadow-glow transition hover:bg-ember no-underline"
                  >
                    Mon Espace
                    <span className="ml-3 transition group-hover:translate-x-1">→</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => setIsSellerModalOpen(true)}
                    className="group inline-flex items-center justify-center rounded-full bg-clay px-7 py-4 text-base font-black text-white shadow-glow transition hover:bg-ember cursor-pointer border-none"
                  >
                    Ouvrir ma boutique
                    <span className="ml-3 transition group-hover:translate-x-1">→</span>
                  </button>
                )}
                <a className="inline-flex items-center justify-center rounded-full border border-white/28 bg-white/8 px-7 py-4 text-base font-black text-white backdrop-blur transition hover:bg-white/15" href="#flow">
                  Voir le fil
                </a>
              </div>

              {/* Social Proof Avatars Row */}
              <div className="reveal mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
                <div className="flex -space-x-3">
                  <img src="https://cdn.sugu.pro/p/sugupro/avatars/avatar-fatoumata.jpg" className="h-10 w-10 rounded-full border-2 border-[#07111F] object-cover shadow-sm" alt="Avatar Fatoumata" />
                  <img src="https://cdn.sugu.pro/p/sugupro/avatars/avatar-mamadou.jpg" className="h-10 w-10 rounded-full border-2 border-[#07111F] object-cover shadow-sm" alt="Avatar Mamadou" />
                  <img src="https://cdn.sugu.pro/p/sugupro/avatars/avatar-seydou.jpg" className="h-10 w-10 rounded-full border-2 border-[#07111F] object-cover shadow-sm" alt="Avatar Seydou" />
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#07111F] bg-clay text-xs font-bold text-white shadow-sm">+</span>
                </div>
                <p className="text-sm font-semibold text-white/72">Rejoint par <span className="font-black text-white">2 500+ vendeurs</span> en Afrique de l'Ouest</p>
              </div>
            </div>

            <div className="reveal hidden self-end lg:block">
              <div className="relative ml-auto max-w-md rounded-[2rem] border border-white/15 bg-night/58 p-4 shadow-deep backdrop-blur-xl">
                <div className="grid gap-3">
                  <div className="rounded-2xl bg-white p-4 text-ink">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-400">Commande</span>
                      <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-palm">en route</span>
                    </div>
                    <p className="mt-2 text-xl font-black text-slate-900">Sandales cuir naturel</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-2xl font-black">01</p>
                      <p className="mt-1 text-xs font-bold text-white/62">reçue</p>
                    </div>
                    <div className="pulse rounded-2xl bg-clay p-4">
                      <p className="text-2xl font-black">02</p>
                      <p className="mt-1 text-xs font-bold text-white/80">livrée</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-2xl font-black">03</p>
                      <p className="mt-1 text-xs font-bold text-white/62">payée</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee Section */}
        <section className="overflow-hidden border-y border-white/10 bg-night py-4">
          <div className="marquee flex min-w-max gap-10 whitespace-nowrap text-xl font-black text-white/22 sm:text-3xl">
            <span>commande reçue</span><span>stock confirmed</span><span>livreur assigné</span><span>client rassuré</span><span>paiement visible</span><span>revenu suivi</span>
            <span>commande reçue</span><span>stock confirmed</span><span>livreur assigné</span><span>client rassuré</span><span>paiement visible</span><span>revenu suivi</span>
          </div>
        </section>

        {/* Flow steps (Le fil) Section */}
        <section id="flow" ref={flowSectionRef} className="bg-night">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.78fr_1.22fr] lg:px-8 lg:py-24">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="reveal text-5xl font-black leading-[.94] tracking-[-0.045em] sm:text-6xl">
                Du message au paiement.
              </h2>
              <p className="reveal mt-5 max-w-md text-lg font-semibold leading-8 text-white/64">
                Une commande ne traverse plus l'équipe comme une rumeur. Elle avance.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
              <div className="space-y-3">
                {flowData.map((item, idx) => (
                  <button
                    key={idx}
                    className={`flow-step ${currentFlow === idx ? "is-active" : ""} w-full rounded-2xl border border-white/12 p-4 text-left cursor-pointer`}
                    onClick={() => setCurrentFlow(idx)}
                    type="button"
                  >
                    <span className="text-sm font-black text-clay">{item.badge}</span>
                    <strong className="mt-2 block text-2xl">{idx === 0 ? "Reçue" : idx === 1 ? "Préparée" : idx === 2 ? "En route" : "Payée"}</strong>
                    <span className="mt-2 block text-sm font-semibold text-white/56">
                      {idx === 0 ? "Produit, client, ville." : idx === 1 ? "Stock confirmé." : idx === 2 ? "Livreur assigné." : "Revenu suivi."}
                    </span>
                  </button>
                ))}
              </div>

              <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-3 shadow-deep">
                <div className="rounded-[1.55rem] bg-[#F7F0E7] p-4 text-[#101828] sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">SUGU / live</p>
                      <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                        {flowData[currentFlow].title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-ink px-3 py-1.5 text-sm font-black text-white">
                      {flowData[currentFlow].badge}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_.9fr]">
                    <div className="rounded-2xl border border-black/10 bg-white p-5">
                      <p className="text-sm font-black text-slate-400">Action</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{flowData[currentFlow].action}</p>
                      <p className="mt-4 min-h-[72px] text-base font-semibold leading-7 text-slate-600">
                        {flowData[currentFlow].copy}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white p-5">
                      <p className="text-sm font-black text-slate-400">Signal</p>
                      <div className="mt-4 h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-clay transition-all duration-500"
                          style={{ width: flowData[currentFlow].bar }}
                        ></div>
                      </div>
                      <p className="mt-4 text-xl font-black text-palm">
                        {flowData[currentFlow].signal}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-ink p-5 text-white">
                    <p className="text-sm font-bold text-white/48">Ce que ça change</p>
                    <p className="mt-2 text-2xl font-black">
                      {flowData[currentFlow].result}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cockpit Section */}
        <section id="cockpit" className="bg-[#F7F0E7] text-ink">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
              <div>
                <h2 className="reveal text-5xl font-black leading-[.94] tracking-[-0.045em] sm:text-6xl text-slate-900">
                  Un cockpit. Pas une pile d'outils.
                </h2>
                <p className="reveal mt-5 max-w-lg text-lg font-semibold leading-8 text-slate-600">
                  Le vendeur garde la main. La livraison garde le rythme. Le client garde confiance.
                </p>
              </div>

              <div className="rounded-[2rem] bg-white p-3 shadow-deep">
                <div className="rounded-[1.4rem] border border-black/10 p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Modules SUGUPro">
                    <button
                      className={`dash-tab ${activeTab === "orders" ? "is-active" : ""} rounded-xl px-4 py-3 text-sm font-black cursor-pointer text-[#101828] hover:bg-slate-100/80 transition-colors`}
                      onClick={() => setActiveTab("orders")}
                      type="button"
                    >
                      Commandes
                    </button>
                    <button
                      className={`dash-tab ${activeTab === "delivery" ? "is-active" : ""} rounded-xl px-4 py-3 text-sm font-black cursor-pointer text-[#101828] hover:bg-slate-100/80 transition-colors`}
                      onClick={() => setActiveTab("delivery")}
                      type="button"
                    >
                      Livraison
                    </button>
                    <button
                      className={`dash-tab ${activeTab === "money" ? "is-active" : ""} rounded-xl px-4 py-3 text-sm font-black cursor-pointer text-[#101828] hover:bg-slate-100/80 transition-colors`}
                      onClick={() => setActiveTab("money")}
                      type="button"
                    >
                      Argent
                    </button>
                    <button
                      className={`dash-tab ${activeTab === "signal" ? "is-active" : ""} rounded-xl px-4 py-3 text-sm font-black cursor-pointer text-[#101828] hover:bg-slate-100/80 transition-colors`}
                      onClick={() => setActiveTab("signal")}
                      type="button"
                    >
                      Chiffres
                    </button>
                  </div>

                  <div className="mt-3 min-h-[330px] rounded-2xl bg-[#F7F0E7] p-5">
                    {/* Orders Panel */}
                    <div className={`dash-panel gap-4 ${activeTab === "orders" ? "is-active" : ""}`}>
                      <h3 className="text-4xl font-black tracking-[-0.04em] text-slate-900">Tout arrive ici.</h3>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm font-black text-slate-400">Nouvelles</p>
                          <p className="mt-2 text-4xl font-black text-slate-900">18</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm font-black text-slate-400">À préparer</p>
                          <p className="mt-2 text-4xl font-black text-slate-900">07</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm font-black text-slate-400">En route</p>
                          <p className="mt-2 text-4xl font-black text-slate-900">12</p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Panel */}
                    <div className={`dash-panel gap-4 ${activeTab === "delivery" ? "is-active" : ""}`}>
                      <h3 className="text-4xl font-black tracking-[-0.04em] text-slate-900">Le trajet parle.</h3>
                      <div className="relative h-44 overflow-hidden rounded-2xl bg-night">
                        <canvas ref={routeCanvasRef} id="routeCanvas" className="absolute inset-0 h-full w-full pointer-events-none"></canvas>
                        <div className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900">Bamako → client</div>
                      </div>
                    </div>

                    {/* Money Panel */}
                    <div className={`dash-panel gap-4 ${activeTab === "money" ? "is-active" : ""}`}>
                      <h3 className="text-4xl font-black tracking-[-0.04em] text-slate-900">L'argent sort du brouillard.</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-5">
                          <p className="text-sm font-black text-slate-400">Payé</p>
                          <p className="mt-2 text-4xl font-black text-[#0E6B57]">+125k</p>
                        </div>
                        <div className="rounded-2xl bg-white p-5">
                          <p className="text-sm font-black text-slate-400">Attente</p>
                          <p className="mt-2 text-4xl font-black text-slate-900">03</p>
                        </div>
                      </div>
                    </div>

                    {/* Signal Panel */}
                    <div className={`dash-panel gap-4 ${activeTab === "signal" ? "is-active" : ""}`}>
                      <h3 className="text-4xl font-black tracking-[-0.04em] text-slate-900">Le vendeur voit ce qui marche.</h3>
                      <div className="grid grid-cols-5 items-end gap-3 rounded-2xl bg-white p-5">
                        <span className="h-14 rounded-t-xl bg-[#F15412]/30"></span>
                        <span className="h-24 rounded-t-xl bg-[#F15412]/50"></span>
                        <span className="h-32 rounded-t-xl bg-[#F15412]"></span>
                        <span className="h-20 rounded-t-xl bg-[#0E6B57]/55"></span>
                        <span className="h-36 rounded-t-xl bg-[#0E6B57]"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Terrain Section */}
        <section id="terrain" className="bg-white text-ink">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[.95fr_1.05fr]">
              <div>
                <h2 className="reveal text-5xl font-black leading-[.94] tracking-[-0.045em] sm:text-6xl text-slate-900">
                  Conçu pour le terrain.
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.6rem] bg-[#F7F0E7] p-6">
                  <p className="text-3xl font-black text-slate-900">Boutiques</p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-slate-600">Produits clairs. Commandes suivies.</p>
                </div>
                <div className="rounded-[1.6rem] bg-ink p-6 text-white">
                  <p className="text-3xl font-black">WhatsApp</p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-white/62">La vente sort du chat.</p>
                </div>
                <div className="rounded-[1.6rem] bg-clay p-6 text-white">
                  <p className="text-3xl font-black">Livreurs</p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-white/74">Un statut. Une route. Une preuve.</p>
                </div>
                <div className="rounded-[1.6rem] bg-mint p-6">
                  <p className="text-3xl font-black text-[#0E6B57]">Marques</p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-slate-700">Plus de ventes. Moins de chaos.</p>
                </div>
              </div>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-4">
              <div className="rounded-[1.4rem] border border-black/10 p-6">
                <p className="text-5xl font-black text-slate-900">2 500+</p>
                <p className="mt-3 font-bold text-slate-500">vendeurs</p>
              </div>
              <div className="rounded-[1.4rem] border border-black/10 p-6">
                <p className="text-5xl font-black text-slate-900">50k+</p>
                <p className="mt-3 font-bold text-slate-500">commandes/mois</p>
              </div>
              <div className="rounded-[1.4rem] border border-black/10 p-6">
                <p className="text-5xl font-black text-slate-900">15+</p>
                <p className="mt-3 font-bold text-slate-500">villes</p>
              </div>
              <div className="rounded-[1.4rem] border border-black/10 p-6">
                <p className="text-5xl font-black text-slate-900">4.8</p>
                <p className="mt-3 font-bold text-slate-500">note affichée</p>
              </div>
            </div>
          </div>
        </section>

        {/* Questions Section */}
        <section id="questions" className="bg-[#F7F0E7] text-ink">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="reveal max-w-3xl text-5xl font-black leading-[.94] tracking-[-0.045em] sm:text-6xl text-slate-900">
              Les vraies questions, sans détour.
            </h2>
            <div className="mt-10 divide-y divide-black/10 rounded-[1.5rem] bg-white shadow-deep">
              <details className="group p-6" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-black text-slate-900 outline-none">
                  Acheteurs : Est-ce que je peux vérifier mon colis avant de payer le livreur ? <span className="text-clay group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                  Oui, absolument. Avec SUGU, vous examinez votre produit devant le livreur pour vous assurer qu'il correspond à votre commande. Si tout est conforme, vous payez et donnez le code de validation reçu sur votre téléphone au livreur pour terminer la course.
                </p>
              </details>
              <details className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-black text-slate-900 outline-none">
                  Vendeurs : Combien coûte l'utilisation de SUGUPro et comment retirer mon argent ? <span className="text-clay group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                  L'inscription et l'ouverture de votre boutique sont entièrement gratuites. Nous prenons seulement une commission fixe de 5 % sur les ventes réussies. Pour récupérer vos gains, vous pouvez faire une demande de retrait gratuite (0 % de frais) par Orange Money, Moov Money, Wave ou virement bancaire dès 5 000 FCFA. L'argent arrive directement sur votre téléphone.
                </p>
              </details>
              <details className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-black text-slate-900 outline-none">
                  Vendeurs : Que se passe-t-il si un client refuse le colis ou ne répond pas aux appels ? <span className="text-clay group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                  Si le client change d'avis ou est injoignable, le livreur ramène immédiatement votre colis à votre stock ou à l'agence partenaire. Vous ne perdez pas votre marchandise et vous pouvez suivre le retour du colis en temps réel directement sur votre application.
                </p>
              </details>
              <details className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-black text-slate-900 outline-none">
                  Agences : Comment SUGUPro nous aide à trouver plus de courses et à gérer nos livreurs ? <span className="text-clay group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                  En connectant votre agence de livraison à la plateforme, les boutiques locales peuvent vous déléguer leurs commandes en un clic. Depuis votre espace agence, vous suivez le trajet de vos livreurs sur la carte en temps réel, optimisez leurs tournées et gérez les encaissements en toute simplicité.
                </p>
              </details>
              <details className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-black text-slate-900 outline-none">
                  Livreurs : Comment être sûr que je recevrai la paie de mes courses ? <span className="text-clay group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                  Chaque livraison est sécurisée par un code unique. Dès que le client valide la commande en vous donnant ce code et que vous le saisissez dans votre application, la course est marquée comme réussie et le prix de votre livraison est instantanément déposé sur votre compte. Vous pouvez transférer vos gains vers votre compte Mobile Money quand vous le souhaitez.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* Final Section */}
        <section id="final" className="relative overflow-hidden bg-night text-white">
          <canvas ref={finalCanvasRef} id="finalCanvas" className="absolute inset-0 h-full w-full opacity-70 pointer-events-none"></canvas>
          <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_.8fr] lg:px-8 lg:py-28">
            <div>
              <h2 className="reveal max-w-4xl text-6xl font-black leading-[.9] tracking-[-0.05em] sm:text-7xl">
                La prochaine commande ne doit plus se perdre.
              </h2>
              <p className="reveal mt-6 max-w-2xl text-xl font-semibold leading-9 text-white/68">
                Ouvrez SUGUPro. Donnez un fil à vos ventes.
              </p>
            </div>

            <div className="reveal self-end rounded-[1.7rem] border border-white/12 bg-white/8 p-6 backdrop-blur-xl text-center sm:text-left">
              <h3 className="text-2xl font-black mb-3">Rejoignez SUGUPro</h3>
              <p className="text-sm font-semibold text-white/64 mb-6 leading-relaxed">
                Prêt à numériser votre activité et à suivre chaque commande en temps réel ?
              </p>
              {user ? (
                <Link
                  href={dashboardUrl}
                  className="group w-full inline-flex items-center justify-center rounded-full bg-clay px-7 py-4 text-base font-black text-white shadow-glow transition hover:bg-ember no-underline"
                >
                  Mon Espace
                  <span className="ml-3 transition group-hover:translate-x-1">→</span>
                </Link>
              ) : (
                <button
                  onClick={() => setIsSellerModalOpen(true)}
                  className="group w-full inline-flex items-center justify-center rounded-full bg-clay px-7 py-4 text-base font-black text-white shadow-glow transition hover:bg-ember cursor-pointer border-none"
                  type="button"
                >
                  Ouvrir ma boutique
                  <span className="ml-3 transition group-hover:translate-x-1">→</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-night px-4 py-8 text-white/50 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <a href="#top" className="flex items-baseline gap-0.5 text-white">
            <span className="text-2xl font-black tracking-[-0.04em]">SUGU</span>
            <span className="text-xs font-black text-clay">Pro</span>
          </a>
          <p className="text-sm font-semibold">© 2026 SUGU. Le système derrière chaque commande.</p>
        </div>
      </footer>

      {/* B2B WHOLESALE PORTAL MODAL */}
      {isSellerModalOpen && (
        <div className="modalOverlay" onClick={() => setIsSellerModalOpen(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modalHeader">
              <button className="modalBackBtn" onClick={() => setIsSellerModalOpen(false)}>
                <ArrowLeft size={24} />
              </button>
              <h2 className="modalTitle">Portail B2B : Grossistes</h2>
              <div style={{ width: 24 }}></div> {/* spacer for centering */}
            </div>

            {/* Illustration wrapper */}
            <div className="modalHero">
              <div className="modalHeroIllustration">
                <img
                  src="https://cdn.sugu.pro/p/seller-hero.png"
                  alt="Sugu Seller Illustration"
                  width={180}
                  height={180}
                  className="modalHeroImg"
                  style={{ height: "auto" }}
                />
              </div>
            </div>

            {/* Seller Form */}
            {isSellerSubmitted ? (
              <div className="successBox" style={{ margin: "40px 10px" }}>
                <div className="successIcon">✓</div>
                <h3 className="successTitle">Demande envoyée !</h3>
                <p className="successSub">
                  Merci de votre intérêt. Notre équipe d'intégration va vous contacter très prochainement sur WhatsApp.
                </p>
              </div>
            ) : (
              <form className="sForm" onSubmit={handleSellerSubmit}>
                {sellerError && <div className="formErrorMessage">{sellerError}</div>}
                
                <div className="sInputWrap">
                  <User className="sInputIcon" size={20} />
                  <input
                    type="text"
                    placeholder="Nom complet"
                    className="sInput"
                    value={sellerData.fullName}
                    onChange={(e) => setSellerData({ ...sellerData, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="sInputWrap">
                  <Store className="sInputIcon" size={20} />
                  <input
                    type="text"
                    placeholder="Nom de la boutique / Entreprise"
                    className="sInput"
                    value={sellerData.storeName}
                    onChange={(e) => setSellerData({ ...sellerData, storeName: e.target.value })}
                    required
                  />
                </div>

                <div className="sInputWrap">
                  <Briefcase className="sInputIcon" size={20} />
                  <select
                    className="sInput"
                    style={{ cursor: "pointer" }}
                    value={sellerData.companyProfile}
                    onChange={(e) => setSellerData({ ...sellerData, companyProfile: e.target.value })}
                    required
                  >
                    <option value="" disabled hidden>
                      Profil d'entreprise (Obligatoire)
                    </option>
                    <option value="fabricant">Fabricant / Usine locale</option>
                    <option value="importateur">Grand Importateur direct</option>
                    <option value="grossiste">Grossiste principal</option>
                    <option value="revendeur">Revendeur indépendant</option>
                  </select>
                </div>

                <div className="sInputWrap">
                  <Shirt className="sInputIcon" size={20} />
                  <select
                    className="sInput"
                    style={{ cursor: "pointer" }}
                    value={sellerData.salesChannel}
                    onChange={(e) => setSellerData({ ...sellerData, salesChannel: e.target.value })}
                    required
                  >
                    <option value="" disabled hidden>
                      Comment vendez-vous actuellement ?
                    </option>
                    <option value="physique">Boutique physique</option>
                    <option value="whatsapp">WhatsApp / Réseaux sociaux</option>
                    <option value="marche">Marché hebdomadaire</option>
                    <option value="plateforme">Autre plateforme en ligne</option>
                    <option value="aucun">Je ne vends pas encore en ligne</option>
                  </select>
                </div>

                <div className="sInputWrap">
                  <Hash className="sInputIcon" size={20} />
                  <select
                    className="sInput"
                    style={{ cursor: "pointer" }}
                    value={sellerData.productCount}
                    onChange={(e) => setSellerData({ ...sellerData, productCount: e.target.value })}
                    required
                  >
                    <option value="" disabled hidden>
                      Capacité Logistique / Volume
                    </option>
                    <option value="palette">Palette / Petit entrepôt</option>
                    <option value="camion">Stock massif / Semi-remorque</option>
                    <option value="conteneur">Importation par Conteneurs entiers</option>
                  </select>
                </div>

                <div className="sInputWrap">
                  <Globe className="sInputIcon" size={20} />
                  <select
                    className="sInput"
                    style={{ cursor: "pointer" }}
                    value={sellerData.country}
                    onChange={(e) => setSellerData({ ...sellerData, country: e.target.value })}
                    required
                  >
                    <option value="" disabled hidden>
                      Pays
                    </option>
                    <option value="BF">Burkina Faso 🇧🇫</option>
                    <option value="CI">Côte d'Ivoire 🇨🇮</option>
                    <option value="SN">Sénégal 🇸🇳</option>
                    <option value="ML">Mali 🇲🇱</option>
                    <option value="TG">Togo 🇹🇬</option>
                    <option value="BJ">Bénin 🇧🇯</option>
                    <option value="NE">Niger 🇳🇪</option>
                    <option value="GW">Guinée-Bissau 🇬🇼</option>
                  </select>
                </div>

                <div className="sBtnGpsWrap">
                  <button type="button" className="sBtnGps" onClick={handleGetLocation}>
                    <Locate size={16} />
                    {sellerData.useLocation ? "Localisation trouvée ✓" : "Utiliser mon GPS (Automatique)"}
                  </button>
                </div>

                <div className="sInputWrap">
                  <MapPin className="sInputIcon" size={20} />
                  <input
                    type="text"
                    placeholder="Ville"
                    className="sInput"
                    value={sellerData.city}
                    onChange={(e) => setSellerData({ ...sellerData, city: e.target.value })}
                    required
                  />
                </div>

                <div className="sInputWrap">
                  <Locate className="sInputIcon" size={20} />
                  <input
                    type="text"
                    placeholder="Quartier"
                    className="sInput"
                    value={sellerData.neighborhood}
                    onChange={(e) => setSellerData({ ...sellerData, neighborhood: e.target.value })}
                  />
                </div>

                <div className="sInputWrap">
                  <MessageCircle className="sInputIcon" size={20} />
                  {sellerData.country && COUNTRY_CODES[sellerData.country] && (
                    <span className="sPhonePrefix">{COUNTRY_CODES[sellerData.country]}</span>
                  )}
                  <input
                    type="tel"
                    placeholder="Téléphone (WhatsApp)"
                    className="sInput"
                    value={sellerData.phone}
                    onChange={(e) => setSellerData({ ...sellerData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="sInputWrap">
                  <Mail className="sInputIcon" size={20} />
                  <input
                    type="email"
                    placeholder="E-mail (facultatif)"
                    className="sInput"
                    value={sellerData.email}
                    onChange={(e) => setSellerData({ ...sellerData, email: e.target.value })}
                  />
                </div>

                <div className="sInputWrap sInputWrapTextarea">
                  <textarea
                    placeholder="Décrivez votre activité en quelques mots (facultatif)"
                    className="sInput sTextarea"
                    value={sellerData.description}
                    onChange={(e) => setSellerData({ ...sellerData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Checkboxes */}
                <div className="sCheckGroup">
                  <label className="sCheckLabel">
                    <input
                      type="checkbox"
                      className="sCheck"
                      checked={sellerData.hasPhotos}
                      onChange={(e) => setSellerData({ ...sellerData, hasPhotos: e.target.checked })}
                    />
                    <span>J'ai déjà des photos de mes produits</span>
                  </label>
                  <label className="sCheckLabel">
                    <input
                      type="checkbox"
                      className="sCheck"
                      checked={sellerData.hasRCCM}
                      onChange={(e) => setSellerData({ ...sellerData, hasRCCM: e.target.checked })}
                    />
                    <span>Je possède un Registre de Commerce (RCCM) et un NIF valides</span>
                  </label>
                </div>

                <p className="sFooterNote">Vous serez contacté pour une qualification de compte.</p>

                <button type="submit" className="sSubmitBtn" disabled={isSellerLoading}>
                  {isSellerLoading ? <div className="loader" /> : "Demander mon accès B2B"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
