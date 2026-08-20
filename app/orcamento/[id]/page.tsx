import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarData } from "@/lib/format";
import OrcamentoActionsClient from "./OrcamentoActionsClient";

export default async function PublicOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      montagens: {
        include: { loja: true },
      },
    },
  });

  if (!orcamento) {
    notFound();
  }

  const statusColors = {
    PENDENTE: "bg-amber-100 text-amber-700",
    APROVADO: "bg-green-100 text-green-700",
    REJEITADO: "bg-red-100 text-red-700",
  };

  const statusLabels = {
    PENDENTE: "Pendente",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-6 bg-navy text-white text-center">
          <h1 className="text-2xl font-bold tracking-tight">Orçamento de Montagem</h1>
          <p className="text-navy-100 mt-1 opacity-80">Empresa de Montagem</p>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <span className="text-slate-500 font-medium">Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[orcamento.status]}`}>
              {statusLabels[orcamento.status]}
            </span>
          </div>

          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-slate-800">Serviços Inclusos</h2>
            {orcamento.montagens.map((m) => (
              <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between font-medium text-slate-800">
                  <span>{m.loja.nome}</span>
                  <span>{formatarMoeda(m.valorServico)}</span>
                </div>
                <div className="text-sm text-slate-500">
                  <p>{m.descricaoServico}</p>
                  {m.dataAgendada && <p className="mt-1">Data: {formatarData(m.dataAgendada)}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            <span className="text-lg font-medium text-slate-600">Total</span>
            <span className="text-2xl font-bold text-navy">{formatarMoeda(orcamento.total)}</span>
          </div>

          {orcamento.status === "PENDENTE" ? (
            <OrcamentoActionsClient orcamentoId={orcamento.id} />
          ) : (
            <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-slate-600 font-medium">
                Este orçamento já foi {statusLabels[orcamento.status].toLowerCase()}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
