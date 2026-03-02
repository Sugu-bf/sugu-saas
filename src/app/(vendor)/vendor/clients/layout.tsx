import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes Clients | SUGUPro Vendeur",
  description: "Gérez vos clients : recherche, filtrage, profils, commandes récentes et actions.",
};

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
