import { Metadata } from "next";
import { WithdrawForm } from "./withdraw-form";

export const metadata: Metadata = {
  title: "Demander un retrait | SUGUPro Vendeur",
  description:
    "Transférez vos fonds vers votre compte mobile ou bancaire.",
};

export default function WithdrawPage() {
  return <WithdrawForm />;
}
