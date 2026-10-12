import type { Metadata } from "next";
import { ProfileContent } from "./profile-content";

export const metadata: Metadata = {
  title: "Mon profil | SUGUPro Coursier",
  description: "Votre identité, la vérification de votre compte et vos réglages.",
};

export default function DriverProfilePage() {
  return <ProfileContent />;
}
