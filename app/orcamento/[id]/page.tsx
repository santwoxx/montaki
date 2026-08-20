import { notFound } from "next/navigation";
import { buscarOrcamento, listarLojas, listarMontagensDoOrcamento, porId } from "@/lib/db";
import { formatarMoeda, formatarData } from "@/lib/format";
import OrcamentoActionsClient from "./OrcamentoActionsClient";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function PublicOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const orcamento = await buscarOrcamento(id);

  if (!orcamento) {
    notFound();
  }

  const [montagensDoOrcamento, lojas] = await Promise.all([
    listarMontagensDoOrcamento(id),
    listarLojas(),
  ]);
  const lojasPorId = porId(lojas);
  const montagens = montagensDoOrcamento.map((m) => ({
    ...m,
    loja: lojasPorId.get(m.lojaId) ?? null,
  }));

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

  const temItens = orcamento.itens && orcamento.itens.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-6 bg-navy text-white text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Logo tamanho="sm" />
            <span className="text-xs font-bold uppercase tracking-widest text-gold">Montaki</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-display">
            Orçamento de Montagem
          </h1>
          <p className="text-slate-300 text-xs">
            Protocolo: #{orcamento.id.slice(0, 7).toUpperCase()}
          </p>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs text-slate-400">Cliente</p>
              <p className="font-bold text-slate-800 text-sm">{orcamento.cliente || "Cliente"}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[orcamento.status]}`}>
              {statusLabels[orcamento.status]}
            </span>
          </div>

          <div className="space-y-4 mb-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Serviços Discriminados
            </h2>

            {/* Exibe itens do orçamento direto */}
            {temItens && (
              <div className="space-y-2">
                {orcamento.itens.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-sm"
                  >
                    <span className="font-medium text-slate-800">
                      {item.quantidade}x {item.nome}
                    </span>
                    <span className="font-bold text-navy">
                      {item.total ? formatarMoeda(item.total) : "A combinar"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Exibe montagens vinculadas caso existam */}
            {!temItens && montagens.length > 0 && (
              <div className="space-y-2">
                {montagens.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1 text-sm"
                  >
                    <div className="flex justify-between font-medium text-slate-800">
                      <span>{m.loja?.nome ?? "Serviço de montagem"}</span>
                      <span className="font-bold text-navy">{formatarMoeda(m.valorServico)}</span>
                    </div>
                    <p className="text-xs text-slate-500">{m.descricaoServico}</p>
                  </div>
                ))}
              </div>
            )}

            {orcamento.observacoes && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-slate-700">
                <strong>Observações:</strong> {orcamento.observacoes}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center bg-navy p-4 rounded-xl text-white mb-6">
            <span className="text-sm font-bold text-slate-300 uppercase">Total Estimado</span>
            <span className="text-2xl font-black text-gold font-display">
              {formatarMoeda(orcamento.total)}
            </span>
          </div>

          {orcamento.status === "PENDENTE" ? (
            <div className="space-y-3">
              <OrcamentoActionsClient orcamentoId={orcamento.id} />
              <p className="text-[11px] text-center text-slate-400">
                Ao aprovar, nossa equipe receberá a confirmação para agendar o serviço.
              </p>
            </div>
          ) : (
            <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-slate-600 font-medium text-sm">
                Este orçamento já foi <strong>{statusLabels[orcamento.status].toLowerCase()}</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
