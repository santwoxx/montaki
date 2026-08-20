import { listarOrcamentos } from "@/lib/db";
import { obterUrlBase } from "@/lib/urlBase";
import { PageHeader } from "@/components/ui";
import AdminOrcamentosClient from "./AdminOrcamentosClient";

export const dynamic = "force-dynamic";

export default async function AdminOrcamentosPage() {
  const orcamentos = await listarOrcamentos();
  const urlBase = await obterUrlBase();
  const linkPublico = `${urlBase}/orcamento/solicitar`;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Orçamentos & Solicitações de Clientes"
        descricao="Gerencie as solicitações de orçamento recebidas pelo link público ou geradas pelo sistema."
      />

      <AdminOrcamentosClient
        orcamentos={orcamentos}
        linkPublico={linkPublico}
      />
    </div>
  );
}
