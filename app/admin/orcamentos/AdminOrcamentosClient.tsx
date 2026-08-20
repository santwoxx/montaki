"use client";

import { useState } from "react";
import Link from "next/link";
import { formatarMoeda, formatarData } from "@/lib/format";
import { Card } from "@/components/ui";
import { atualizarStatusOrcamentoAction } from "@/lib/actions/orcamentos";
import type { Orcamento, StatusOrcamento } from "@/lib/tipos";

export default function AdminOrcamentosClient({
  orcamentos,
  linkPublico,
}: {
  orcamentos: Orcamento[];
  linkPublico: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"TODOS" | StatusOrcamento>("TODOS");
  const [busca, setBusca] = useState("");
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch (e) {
      console.error("Falha ao copiar:", e);
    }
  };

  const mudarStatus = async (id: string, novoStatus: StatusOrcamento) => {
    setProcessandoId(id);
    try {
      await atualizarStatusOrcamentoAction(id, novoStatus);
    } catch {
      alert("Erro ao atualizar status do orçamento.");
    } finally {
      setProcessandoId(null);
    }
  };

  // Filtros
  const filtrados = orcamentos.filter((orc) => {
    const atendeAba = abaAtiva === "TODOS" || orc.status === abaAtiva;
    const termo = busca.toLowerCase().trim();
    const atendeBusca =
      !termo ||
      (orc.cliente || "").toLowerCase().includes(termo) ||
      (orc.telefone || "").includes(termo) ||
      (orc.cidade || "").toLowerCase().includes(termo) ||
      (orc.itens || []).some((it) => it.nome.toLowerCase().includes(termo));

    return atendeAba && atendeBusca;
  });

  const totalPendentes = orcamentos.filter((o) => o.status === "PENDENTE").length;
  const totalAprovados = orcamentos.filter((o) => o.status === "APROVADO").length;
  const valorTotal = orcamentos.reduce((acc, curr) => acc + curr.total, 0);

  const STATUS_CLASSES: Record<StatusOrcamento, string> = {
    PENDENTE: "bg-amber-100 text-amber-800 border-amber-300",
    APROVADO: "bg-emerald-100 text-emerald-800 border-emerald-300",
    REJEITADO: "bg-rose-100 text-rose-800 border-rose-300",
  };

  const mensagemWhatsAppGenerica = encodeURIComponent(
    `Olá! Sou da equipe Montaki Móveis. Você pode fazer seu orçamento online diretamente no link: ${linkPublico}`
  );

  return (
    <div className="space-y-6">
      {/* Card de Compartilhamento do Link de Orçamento */}
      <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-r from-navy via-navy to-navy-light p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-gold px-2.5 py-0.5 text-xs font-black text-navy uppercase font-display">
                Novo Recurso
              </span>
              <span className="text-xs text-slate-300 font-medium">Autoatendimento</span>
            </div>
            <h2 className="text-xl font-bold font-display text-white">
              Link de Orçamento para Clientes
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Envie este link para clientes no WhatsApp, redes sociais ou site. O cliente escolhe os móveis, calcula a estimativa e você recebe a solicitação aqui no painel!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center rounded-xl bg-white/10 px-3 py-2 text-xs font-mono text-slate-200 border border-white/10 max-w-xs truncate">
              {linkPublico}
            </div>
            <button
              onClick={copiarLink}
              className="flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-navy shadow hover:bg-gold-light transition-all shrink-0 font-display"
            >
              {copiado ? "✓ Link Copiado!" : "📋 Copiar Link"}
            </button>
            <a
              href={`https://wa.me/?text=${mensagemWhatsAppGenerica}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-[#1EBE5D] transition-all shrink-0 font-display"
            >
              💬 WhatsApp
            </a>
            <a
              href={linkPublico}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-xl border border-white/20 px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors shrink-0"
              title="Abrir página"
            >
              ↗
            </a>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total de Orçamentos</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-display">{orcamentos.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 uppercase">Pendentes</p>
          <p className="text-2xl font-bold text-amber-900 mt-1 font-display">{totalPendentes}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 uppercase">Aprovados</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1 font-display">{totalAprovados}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Volume em R$</p>
          <p className="text-2xl font-bold text-navy mt-1 font-display">{formatarMoeda(valorTotal)}</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 overflow-x-auto">
          {(["TODOS", "PENDENTE", "APROVADO", "REJEITADO"] as const).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                abaAtiva === aba
                  ? "bg-white text-navy shadow-sm"
                  : "text-slate-600 hover:text-navy hover:bg-white/50"
              }`}
            >
              {aba === "TODOS"
                ? "Todos"
                : aba === "PENDENTE"
                ? `Pendentes (${totalPendentes})`
                : aba === "APROVADO"
                ? `Aprovados (${totalAprovados})`
                : "Rejeitados"}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <input
            type="text"
            placeholder="🔍 Buscar por cliente, telefone ou móvel..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs shadow-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Listagem de Orçamentos */}
      {filtrados.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          <p className="text-base font-semibold text-slate-700">Nenhum orçamento encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            {busca
              ? "Tente buscar com outros termos."
              : "Compartilhe o link acima para receber orçamentos de novos clientes!"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtrados.map((orc) => {
            const telLimpo = (orc.telefone || "").replace(/\D/g, "");
            const msgCliente = encodeURIComponent(
              `Olá ${orc.cliente || "Cliente"}! Sou da equipe Montaki sobre seu orçamento #${orc.id.slice(0, 7).toUpperCase()}${orc.total > 0 ? ` no valor de ${formatarMoeda(orc.total)}` : ""}. Gostaria de confirmar detalhes e agendamento da montagem!`
            );

            return (
              <Card
                key={orc.id}
                className="hover:border-gold/50 transition-all border border-slate-200 p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-gold font-bold font-display text-sm">
                      #{orc.id.slice(0, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">
                          {orc.cliente || "Cliente sem nome"}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_CLASSES[orc.status]}`}
                        >
                          {orc.status}
                        </span>
                        {orc.fotos && orc.fotos.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            📸 {orc.fotos.length} foto(s)
                          </span>
                        )}
                        {orc.respostaAdmin?.enviadoEm && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ✓ Preço Enviado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Solicitado em {formatarData(orc.criadoEm)}
                        {orc.origem === "CLIENTE" && (
                          <span className="ml-2 font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                            🌐 Via Link do Cliente
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block">Valor Montagem</span>
                    <span className="text-xl font-extrabold text-navy font-display">
                      {orc.total > 0 ? formatarMoeda(orc.total) : "Sob consulta"}
                    </span>
                  </div>
                </div>

                {/* Dados de Contato e Itens */}
                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="space-y-1.5 text-slate-700 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                    <p>
                      <strong className="text-slate-900">WhatsApp:</strong>{" "}
                      {orc.telefone ? (
                        <a
                          href={`https://wa.me/55${telLimpo}?text=${msgCliente}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          💬 {orc.telefone} (Abrir conversa)
                        </a>
                      ) : (
                        "Não informado"
                      )}
                    </p>
                    {orc.endereco && (
                      <p>
                        <strong className="text-slate-900">Endereço:</strong> {orc.endereco}{" "}
                        {orc.cidade ? `- ${orc.cidade}` : ""}
                      </p>
                    )}
                    {orc.observacoes && (
                      <p className="italic text-slate-600">
                        <strong className="text-slate-900">Obs:</strong> {orc.observacoes}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 bg-slate-50/60 p-3 rounded-xl border border-slate-100 max-h-32 overflow-y-auto">
                    <strong className="text-slate-900 block mb-1">
                      Móveis & Serviços ({orc.itens?.length || 0}):
                    </strong>
                    {orc.itens && orc.itens.length > 0 ? (
                      <ul className="space-y-1">
                        {orc.itens.map((it, idx) => (
                          <li key={idx} className="flex justify-between text-slate-600">
                            <span>
                              {it.quantidade}x {it.nome}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {it.total ? formatarMoeda(it.total) : "A combinar"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">Nenhum item discriminado</p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {orc.status === "PENDENTE" && (
                      <>
                        <button
                          disabled={processandoId === orc.id}
                          onClick={() => mudarStatus(orc.id, "APROVADO")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          ✓ Aprovar
                        </button>
                        <button
                          disabled={processandoId === orc.id}
                          onClick={() => mudarStatus(orc.id, "REJEITADO")}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 disabled:opacity-50 transition-colors"
                        >
                          ✕ Recusar
                        </button>
                      </>
                    )}
                    {orc.status !== "PENDENTE" && (
                      <button
                        disabled={processandoId === orc.id}
                        onClick={() => mudarStatus(orc.id, "PENDENTE")}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {telLimpo && (
                      <a
                        href={`https://wa.me/55${telLimpo}?text=${msgCliente}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1EBE5D] transition-colors"
                      >
                        <span>💬 WhatsApp</span>
                      </a>
                    )}

                    <Link
                      href={`/admin/orcamentos/${orc.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-light transition-colors"
                    >
                      <span>Gerenciar & Montagem ➜</span>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
