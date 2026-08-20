"use client";

import { useState } from "react";
import { formatarMoeda } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import {
  criarServicoAction,
  atualizarServicoAction,
  excluirServicoAction,
  restaurarTabelaPadraoAction,
} from "@/lib/actions/servicos";
import type { ItemTabelaPreco, CategoriaServico } from "@/lib/tipos";

export default function AdminServicosClient({
  servicos,
}: {
  servicos: ItemTabelaPreco[];
}) {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<"TODOS" | CategoriaServico | "INATIVOS">("TODOS");
  
  // Estados dos modais
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState<ItemTabelaPreco | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<ItemTabelaPreco | null>(null);
  const [modalRestaurarAberto, setModalRestaurarAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Filtros
  const filtrados = servicos.filter((item) => {
    const termo = busca.toLowerCase().trim();
    const atendeBusca =
      !termo ||
      item.nome.toLowerCase().includes(termo) ||
      (item.observacao || "").toLowerCase().includes(termo) ||
      item.precoFormatado.toLowerCase().includes(termo);

    let atendeCategoria = true;
    if (categoriaFiltro === "INATIVOS") {
      atendeCategoria = item.ativo === false;
    } else if (categoriaFiltro !== "TODOS") {
      atendeCategoria = item.categoria === categoriaFiltro && item.ativo !== false;
    } else {
      atendeCategoria = item.ativo !== false;
    }

    return atendeBusca && atendeCategoria;
  });

  const totalPrincipais = servicos.filter((s) => s.categoria === "Principal" && s.ativo !== false).length;
  const totalAdicionais = servicos.filter((s) => s.categoria === "Adicional" && s.ativo !== false).length;
  const totalInativos = servicos.filter((s) => s.ativo === false).length;

  return (
    <div className="space-y-6">
      {/* Header & Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Tabela de Preços & Serviços de Montagem
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre novos móveis, altere valores de montagem ou remova itens do catálogo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalRestaurarAberto(true)}
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            title="Restaura os valores padrões de fábrica"
          >
            ↺ Restaurar Padrão
          </button>
          <button
            onClick={() => setModalCriarAberto(true)}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-navy shadow-sm hover:bg-gold-light transition-all font-display uppercase tracking-wide"
          >
            <span>+</span> Novo Item de Montagem
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Ativos</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-display">
            {servicos.filter((s) => s.ativo !== false).length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-800 uppercase">Móveis Principais</p>
          <p className="text-2xl font-bold text-amber-900 mt-1 font-display">{totalPrincipais}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-800 uppercase">Serviços Adicionais</p>
          <p className="text-2xl font-bold text-blue-900 mt-1 font-display">{totalAdicionais}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Itens Inativos</p>
          <p className="text-2xl font-bold text-slate-600 mt-1 font-display">{totalInativos}</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 overflow-x-auto">
          {(
            [
              { id: "TODOS", label: `Todos (${servicos.filter((s) => s.ativo !== false).length})` },
              { id: "Principal", label: `Móveis Principais (${totalPrincipais})` },
              { id: "Adicional", label: `Adicionais (${totalAdicionais})` },
              ...(totalInativos > 0
                ? [{ id: "INATIVOS", label: `Inativos (${totalInativos})` }]
                : []),
            ] as const
          ).map((aba) => (
            <button
              key={aba.id}
              onClick={() => setCategoriaFiltro(aba.id as typeof categoriaFiltro)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                categoriaFiltro === aba.id
                  ? "bg-white text-navy shadow-xs"
                  : "text-slate-600 hover:text-navy hover:bg-white/50"
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-80">
          <input
            type="text"
            placeholder="🔍 Buscar móvel ou serviço por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs shadow-xs focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Itens */}
      {filtrados.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          <p className="text-base font-semibold text-slate-700">Nenhum item encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            {busca
              ? "Tente buscar com outro nome."
              : "Clique em '+ Novo Item de Montagem' para adicionar seu primeiro móvel à tabela!"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((item) => {
            const ehPrincipal = item.categoria === "Principal";
            const inativo = item.ativo === false;

            return (
              <Card
                key={item.id}
                className={`flex flex-col justify-between p-4 transition-all border ${
                  inativo
                    ? "opacity-60 bg-slate-50 border-slate-200"
                    : "hover:border-gold/60 border-slate-200 bg-white shadow-xs"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        ehPrincipal
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      }`}
                    >
                      {ehPrincipal ? "🛋️ Principal" : "⚙️ Adicional"}
                    </span>

                    {inativo && (
                      <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {item.nome}
                  </h3>

                  {item.observacao && (
                    <p className="text-xs text-slate-500 italic line-clamp-2">
                      {item.observacao}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Preço Montagem
                    </span>
                    <span className="text-base font-extrabold text-navy font-display">
                      {item.precoFormatado}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setItemParaEditar(item)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-gold/20 hover:text-navy hover:border-gold transition-colors"
                      title="Editar preço e dados do móvel"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemParaExcluir(item)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                      title="Remover móvel da tabela"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: CRIAR NOVO ITEM */}
      {modalCriarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-display">
                + Novo Item de Montagem
              </h3>
              <button
                type="button"
                onClick={() => setModalCriarAberto(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                setSalvando(true);
                try {
                  await criarServicoAction(formData);
                  setModalCriarAberto(false);
                } finally {
                  setSalvando(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nome do Móvel / Serviço *
                </label>
                <input
                  type="text"
                  name="nome"
                  required
                  placeholder="Ex: Poltrona Reclinável, Guarda-roupa 8 portas..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Categoria *
                  </label>
                  <select
                    name="categoria"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="Principal">🛋️ Principal (Móvel padrão)</option>
                    <option value="Adicional">⚙️ Adicional / Serviço Extra</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Preço Base (R$)
                  </label>
                  <input
                    type="text"
                    name="precoBase"
                    inputMode="decimal"
                    placeholder="Ex: 88,00 (Vazio = Sob Orçamento)"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:outline-none font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Deixe em branco para &quot;Orçamento&quot;</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Sufixo de Exibição (opcional)
                  </label>
                  <input
                    type="text"
                    name="sufixo"
                    placeholder="Ex: +, /un., /km"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Texto Personalizado (opcional)
                  </label>
                  <input
                    type="text"
                    name="precoFormatado"
                    placeholder="Ex: 50% do valor da montagem"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Observação / Detalhes (opcional)
                </label>
                <input
                  type="text"
                  name="observacao"
                  placeholder="Ex: A partir de R$ 275,00, inclui fixação..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalCriarAberto(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-gold px-5 py-2.5 font-bold text-navy shadow hover:bg-gold-light disabled:opacity-50 transition-all font-display uppercase tracking-wide"
                >
                  {salvando ? "Salvando..." : "Salvar Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ITEM */}
      {itemParaEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-display">
                ✏️ Editar Item de Montagem
              </h3>
              <button
                type="button"
                onClick={() => setItemParaEditar(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                setSalvando(true);
                try {
                  await atualizarServicoAction(itemParaEditar.id, formData);
                  setItemParaEditar(null);
                } finally {
                  setSalvando(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nome do Móvel / Serviço *
                </label>
                <input
                  type="text"
                  name="nome"
                  required
                  defaultValue={itemParaEditar.nome}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Categoria *
                  </label>
                  <select
                    name="categoria"
                    required
                    defaultValue={itemParaEditar.categoria}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="Principal">🛋️ Principal (Móvel padrão)</option>
                    <option value="Adicional">⚙️ Adicional / Serviço Extra</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Preço Base (R$)
                  </label>
                  <input
                    type="text"
                    name="precoBase"
                    inputMode="decimal"
                    defaultValue={
                      itemParaEditar.precoBase !== null && itemParaEditar.precoBase !== undefined
                        ? itemParaEditar.precoBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                        : ""
                    }
                    placeholder="Ex: 88,00"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:outline-none font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Deixe em branco para &quot;Orçamento&quot;</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Texto Formatado de Exibição (opcional)
                </label>
                <input
                  type="text"
                  name="precoFormatado"
                  defaultValue={itemParaEditar.precoFormatado}
                  placeholder="Ex: R$ 275,00+ ou 50% do valor"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Observação / Detalhes (opcional)
                </label>
                <input
                  type="text"
                  name="observacao"
                  defaultValue={itemParaEditar.observacao ?? ""}
                  placeholder="Ex: A partir de R$ 275,00"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-gold focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="ativo"
                    defaultChecked={itemParaEditar.ativo !== false}
                    className="h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Item Ativo (visível para clientes na calculadora e tabela de preços)
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setItemParaEditar(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-gold px-5 py-2.5 font-bold text-navy shadow hover:bg-gold-light disabled:opacity-50 transition-all font-display uppercase tracking-wide"
                >
                  {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Excluir Item da Tabela?
            </h3>
            <p className="text-xs text-slate-600">
              Tem certeza que deseja remover <strong>{itemParaExcluir.nome}</strong> da tabela de montagem? Ele deixará de aparecer nas solicitações de orçamento e na tabela pública.
            </p>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <form
                action={async () => {
                  setSalvando(true);
                  try {
                    await excluirServicoAction(itemParaExcluir.id);
                    setItemParaExcluir(null);
                  } finally {
                    setSalvando(false);
                  }
                }}
              >
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                  {salvando ? "Excluindo..." : "Sim, Excluir"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESTAURAR TABELA PADRÃO */}
      {modalRestaurarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              ↺ Restaurar Tabela Padrão?
            </h3>
            <p className="text-xs text-slate-600">
              Esta ação irá reinicializar todos os itens da tabela com a lista oficial de fábrica da Montaki. Novos itens que você cadastrou não serão apagados.
            </p>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModalRestaurarAberto(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <form
                action={async () => {
                  setSalvando(true);
                  try {
                    await restaurarTabelaPadraoAction();
                    setModalRestaurarAberto(false);
                  } finally {
                    setSalvando(false);
                  }
                }}
              >
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-gold px-4 py-2 text-xs font-bold text-navy shadow hover:bg-gold-light disabled:opacity-50 transition-colors font-display uppercase"
                >
                  {salvando ? "Restaurando..." : "Sim, Restaurar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
