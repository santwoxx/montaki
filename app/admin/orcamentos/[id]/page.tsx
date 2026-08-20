import { notFound } from "next/navigation";
import Link from "next/link";
import {
  buscarOrcamento,
  listarLojas,
  listarMontadores,
  listarMontagensDoOrcamento,
  porId,
} from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import LinkClient from "./LinkClient";
import AdminOrcamentoDetalhesClient from "./AdminOrcamentoDetalhesClient";
import { obterUrlBase } from "@/lib/urlBase";
import { formatarMoeda, formatarData } from "@/lib/format";
import {
  converterOrcamentoEmMontagemAction,
  atualizarStatusOrcamentoAction,
  excluirOrcamentoAction,
} from "@/lib/actions/orcamentos";

export const dynamic = "force-dynamic";

export default async function AdminOrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) || {};

  const orcamento = await buscarOrcamento(id);

  if (!orcamento) {
    notFound();
  }

  const [montagensDoOrcamento, lojas, montadores] = await Promise.all([
    listarMontagensDoOrcamento(id),
    listarLojas(),
    listarMontadores(),
  ]);

  const linkOrcamento = `${await obterUrlBase()}/orcamento/${id}`;
  const lojasPorId = porId(lojas);
  const montagens = montagensDoOrcamento.map((m) => ({
    ...m,
    loja: lojasPorId.get(m.lojaId) ?? null,
  }));

  const STATUS_CLASSES: Record<string, string> = {
    PENDENTE: "bg-amber-100 text-amber-800",
    APROVADO: "bg-emerald-100 text-emerald-800",
    REJEITADO: "bg-rose-100 text-rose-800",
  };

  const temItens = orcamento.itens && orcamento.itens.length > 0;
  const temMontagens = montagens.length > 0;

  const converterAction = converterOrcamentoEmMontagemAction.bind(null, orcamento.id);
  const excluirAction = excluirOrcamentoAction.bind(null, orcamento.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orcamentos"
          className="text-xs font-semibold text-slate-500 hover:text-navy transition-colors inline-flex items-center gap-1"
        >
          ← Voltar para Orçamentos
        </Link>

        <form action={excluirAction}>
          <button
            type="submit"
            className="text-xs text-rose-600 hover:text-rose-800 hover:underline transition-colors"
          >
            Excluir Orçamento
          </button>
        </form>
      </div>

      <PageHeader
        titulo={`Orçamento #${orcamento.id.slice(0, 7).toUpperCase()}`}
        descricao="Detalhes da solicitação de orçamento, avaliação de fotos de móveis, precificação e agendamento."
      />

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

      {/* Componente Interativo de Fotos & Precificação com WhatsApp */}
      <AdminOrcamentoDetalhesClient orcamento={orcamento} linkPublico={linkOrcamento} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Coluna Esquerda: Dados do Cliente e Link */}
        <div className="space-y-6">
          {/* Card Resumo do Cliente */}
          <Card className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Dados do Cliente</h3>
              <Badge className={STATUS_CLASSES[orcamento.status] || STATUS_CLASSES.PENDENTE}>
                {orcamento.status}
              </Badge>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Nome:</span>
                <span className="font-semibold text-slate-900">{orcamento.cliente || "Não informado"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">WhatsApp / Telefone:</span>
                <span className="font-bold text-emerald-800 font-mono">
                  {orcamento.telefone ? `📞 ${orcamento.telefone}` : "Não informado"}
                </span>
              </div>
              {orcamento.endereco && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Endereço:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {orcamento.endereco} {orcamento.cidade ? `- ${orcamento.cidade}` : ""}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Solicitado em:</span>
                <span className="font-medium text-slate-900">{formatarData(orcamento.criadoEm)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Origem:</span>
                <span className="font-medium text-slate-900">
                  {orcamento.origem === "CLIENTE" ? "🌐 Autoatendimento pelo Link" : "⚙️ Painel Interno"}
                </span>
              </div>
              {orcamento.observacoes && (
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                  <strong className="text-slate-800">Observações do cliente:</strong> {orcamento.observacoes}
                </div>
              )}
            </div>

            {/* Ações de Status */}
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <form
                action={async () => {
                  "use server";
                  await atualizarStatusOrcamentoAction(orcamento.id, "APROVADO");
                }}
                className="flex-1"
              >
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  ✓ Marcar como Aprovado
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await atualizarStatusOrcamentoAction(orcamento.id, "REJEITADO");
                }}
                className="flex-1"
              >
                <button
                  type="submit"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                >
                  ✕ Recusar
                </button>
              </form>
            </div>
          </Card>

          {/* Link para o Cliente Visualizar */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-2 text-sm">
              Link de Visualização do Orçamento
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Envie para o cliente ver este orçamento formalizado online:
            </p>
            <LinkClient link={linkOrcamento} />
          </Card>
        </div>

        {/* Coluna Direita: Itens e Transformação em Montagem */}
        <div className="space-y-6">
          {/* Card Itens Selecionados */}
          <Card className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Itens & Serviços Solicitados</h3>
              <span className="text-lg font-black text-navy font-display">
                {formatarMoeda(orcamento.total)}
              </span>
            </div>

            {temItens ? (
              <div className="space-y-2">
                {orcamento.itens.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800 border border-slate-100"
                  >
                    <div>
                      <span className="font-medium">
                        {it.quantidade}x {it.nome}
                      </span>
                      {it.observacao && (
                        <span className="block text-[11px] text-slate-500 italic">
                          {it.observacao}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-navy shrink-0">
                      {it.total ? formatarMoeda(it.total) : "Sob consulta"}
                    </span>
                  </div>
                ))}
              </div>
            ) : temMontagens ? (
              <div className="space-y-2">
                {montagens.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800 border border-slate-100"
                  >
                    <div className="flex justify-between font-medium">
                      <span>{m.loja?.nome ?? "Loja"}</span>
                      <span className="font-bold text-navy">{formatarMoeda(m.valorServico)}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">{m.descricaoServico}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Nenhum item discriminado.</p>
            )}
          </Card>

          {/* Transformar em Montagem */}
          <Card className="border-2 border-gold/40 bg-amber-50/20 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 font-display">
                <span>🔨</span> Transformar em Ordem de Montagem
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Gere uma ordem de serviço de montagem a partir deste orçamento aprovado.
              </p>
            </div>

            <form action={converterAction} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loja Parceira / Origem *
                </label>
                <select
                  name="lojaId"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-gold focus:outline-none"
                >
                  <option value="">Selecione uma loja...</option>
                  {lojas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Montador Responsável (opcional)
                </label>
                <select
                  name="montadorId"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-gold focus:outline-none"
                >
                  <option value="">A definir depois</option>
                  {montadores.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Agendada *
                  </label>
                  <input
                    type="date"
                    name="dataAgendada"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Final (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="valorServico"
                    defaultValue={orcamento.total}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-gold focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <SubmitButton variante="primario" className="w-full">
                  🔨 Criar Montagem Agora
                </SubmitButton>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
