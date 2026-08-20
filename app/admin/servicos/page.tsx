import { listarTodosServicosAdmin } from "@/lib/db";
import AdminServicosClient from "./AdminServicosClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tabela de Preços e Serviços | Admin Montaki",
  description: "Gerenciamento de valores e móveis da tabela de preços da Montaki.",
};

export const dynamic = "force-dynamic";

export default async function AdminServicosPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const sp = (await searchParams) || {};
  const servicos = await listarTodosServicosAdmin();

  return (
    <div className="space-y-6">
      {sp.erro && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-200">
          ⚠️ {sp.erro}
        </div>
      )}
      {sp.sucesso && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800 border border-green-200">
          ✓ {sp.sucesso}
        </div>
      )}

      <AdminServicosClient servicos={servicos} />
    </div>
  );
}
