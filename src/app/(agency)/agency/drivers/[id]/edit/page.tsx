import { EditDriverForm } from "./_components/edit-driver-form";

export const metadata = {
  title: "Modifier le livreur — Agence SUGU",
};

interface EditDriverPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDriverPage({ params }: EditDriverPageProps) {
  const { id } = await params;
  return <EditDriverForm courierId={id} />;
}
