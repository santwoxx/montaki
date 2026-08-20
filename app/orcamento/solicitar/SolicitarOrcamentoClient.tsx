"use client";

import { useState } from "react";
import Link from "next/link";
import { tabelaPrecos, regrasComerciais, type ItemTabelaPreco } from "@/lib/tabelaPrecos";
import { solicitarOrcamentoPublicoAction } from "@/lib/actions/orcamentos";
import { formatarMoeda } from "@/lib/format";
import { Logo } from "@/components/Logo";

type ItemSelecionado = {
  item: ItemTabelaPreco;
  quantidade: number;
};

export default function SolicitarOrcamentoClient() {
  const principais = tabelaPrecos.filter((item) => item.categoria === "Principal");
  const adicionais = tabelaPrecos.filter((item) => item.categoria === "Adicional");

  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [desmontagemAtiva, setDesmontagemAtiva] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoId, setSucessoId] = useState<string | null>(null);

  const alterarQuantidade = (id: string, delta: number) => {
    setQuantidades((prev) => {
      const atual = prev[id] || 0;
      const nova = Math.max(0, atual + delta);
      if (nova === 0) {
        const copia = { ...prev };
        delete copia[id];
        return copia;
      }
      return { ...prev, [id]: nova };
    });
  };

  // Itens selecionados formatados
  const itensSelecionados: ItemSelecionado[] = Object.entries(quantidades)
    .map(([id, qtd]) => {
      const item = tabelaPrecos.find((p) => p.id === id);
      if (!item || qtd <= 0) return null;
      return { item, quantidade: qtd };
    })
    .filter((it): it is ItemSelecionado => it !== null);

  // Cálculo do subtotal dos serviços com preço base
  const subtotalBase = itensSelecionados.reduce((acc, curr) => {
    if (curr.item.precoBase) {
      return acc + curr.item.precoBase * curr.quantidade;
    }
    return acc;
  }, 0);

  // Desmontagem (50% do valor da montagem principal se ativa)
  const valorDesmontagem = desmontagemAtiva ? subtotalBase * 0.5 : 0;
  const totalEstimado = subtotalBase + valorDesmontagem;

  const totalItens = itensSelecionados.reduce((acc, curr) => acc + curr.quantidade, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro("Por favor, preencha seu nome.");
      return;
    }

    if (!telefone.trim() || telefone.replace(/\D/g, "").length < 8) {
      setErro("Por favor, informe um WhatsApp ou telefone para contato.");
      return;
    }

    if (itensSelecionados.length === 0) {
      setErro("Selecione ao menos um móvel ou serviço para solicitar o orçamento.");
      return;
    }

    setEnviando(true);

    try {
      const listaFinal = itensSelecionados.map((it) => ({
        servicoId: it.item.id,
        nome: it.item.nome,
        quantidade: it.quantidade,
        valorUnitario: it.item.precoBase,
        total: it.item.precoBase ? it.item.precoBase * it.quantidade : null,
      }));

      if (desmontagemAtiva && valorDesmontagem > 0) {
        listaFinal.push({
          servicoId: "a1",
          nome: "Desmontagem de móveis (50%)",
          quantidade: 1,
          valorUnitario: valorDesmontagem,
          total: valorDesmontagem,
        });
      }

      const res = await solicitarOrcamentoPublicoAction({
        cliente: nome.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim() || undefined,
        cidade: cidade.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        itens: listaFinal,
        total: totalEstimado,
      });

      if (res.sucesso && res.id) {
        setSucessoId(res.id);
      } else {
        setErro(res.erro || "Erro ao processar orçamento.");
      }
    } catch {
      setErro("Ocorreu um erro ao enviar seu orçamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const principaisFiltrados = principais.filter((item) =>
    item.nome.toLowerCase().includes(filtroBusca.toLowerCase())
  );

  // Mensagem pré-formatada para WhatsApp
  const mensagemWhatsApp = encodeURIComponent(
    `Olá Montaki! Acabei de solicitar um orçamento no site.\n\n` +
      `*Protocolo:* #${sucessoId?.slice(0, 7).toUpperCase()}\n` +
      `*Cliente:* ${nome}\n` +
      `*Itens:* ${itensSelecionados.map((it) => `${it.quantidade}x ${it.item.nome}`).join(", ")}${desmontagemAtiva ? " + Desmontagem" : ""}\n` +
      `*Total estimado:* ${formatarMoeda(totalEstimado)}\n\n` +
      `Gostaria de confirmar a disponibilidade e agendamento.`
  );

  if (sucessoId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-emerald-500/30 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">
            Orçamento Solicitado com Sucesso!
          </h2>
          <p className="mt-2 text-slate-600">
            Recebemos sua solicitação de orçamento. Nossa equipe entrará em contato em breve para confirmar detalhes e agendamento.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm border border-slate-200">
            <div className="flex justify-between font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-2">
              <span>Protocolo:</span>
              <span className="font-mono text-navy font-bold">#{sucessoId.slice(0, 7).toUpperCase()}</span>
            </div>
            <div className="space-y-1 text-slate-600">
              <p><strong>Cliente:</strong> {nome}</p>
              <p><strong>WhatsApp:</strong> {telefone}</p>
              {endereco && <p><strong>Endereço:</strong> {endereco} {cidade ? `- ${cidade}` : ""}</p>}
              <div className="pt-2">
                <strong>Serviços Selecionados:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs text-slate-700">
                  {itensSelecionados.map((it) => (
                    <li key={it.item.id}>
                      {it.quantidade}x {it.item.nome} ({it.item.precoFormatado})
                    </li>
                  ))}
                  {desmontagemAtiva && <li>1x Desmontagem de móvel (+50%)</li>}
                </ul>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2 font-bold text-base text-navy">
                <span>Estimativa a partir de:</span>
                <span className="text-emerald-700">{formatarMoeda(totalEstimado)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`https://wa.me/5524993210547?text=${mensagemWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 font-bold text-white shadow hover:bg-[#1EBE5D] transition-all"
            >
              <span>💬 Enviar no WhatsApp da Montaki</span>
            </a>
            <button
              onClick={() => {
                setSucessoId(null);
                setQuantidades({});
                setNome("");
                setTelefone("");
                setEndereco("");
                setCidade("");
                setObservacoes("");
              }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Fazer Outro Orçamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header com identidade visual Montaki (Amarelo, Vermelho e Verde) */}
      <div className="rounded-2xl bg-gradient-to-r from-red-900 via-red-800 to-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-red-700/40">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-300 via-yellow-500 to-transparent"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-2">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Logo tamanho="sm" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-300/30">
                Montaki Serviços
              </span>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                ● Atendimento Online
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
              Solicitar Orçamento Online
            </h1>
            <p className="text-sm text-amber-100/90 max-w-xl">
              Monte seu pacote de montagem abaixo. Veja o valor estimado na hora e envie direto para nossa equipe!
            </p>
          </div>
          <div className="shrink-0 flex gap-2">
            <Link
              href="/tabela-precos"
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 text-xs font-bold transition-all shadow-md font-display uppercase tracking-wide"
            >
              📋 Tabela Oficial
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
        {/* Coluna 1 & 2: Seleção de Móveis e Serviços */}
        <div className="lg:col-span-2 space-y-6">
          {/* Busca rápida */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar móvel ou serviço (ex: Guarda-roupa, Cama, Painel, Cozinha)..."
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none"
            />
          </div>

          {/* Serviços Principais */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🛋️</span> Móveis & Serviços Principais
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {principaisFiltrados.length} opções disponíveis
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {principaisFiltrados.map((item) => {
                const qtd = quantidades[item.id] || 0;
                const selecionado = qtd > 0;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col justify-between rounded-xl p-3.5 transition-all border ${
                      selecionado
                        ? "border-gold bg-amber-50/40 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-sm text-slate-800 leading-tight">
                          {item.nome}
                        </p>
                        {item.observacao && (
                          <span className="text-[11px] text-slate-500">{item.observacao}</span>
                        )}
                      </div>
                      <span className="shrink-0 rounded-lg bg-navy/5 px-2.5 py-1 text-xs font-bold text-navy">
                        {item.precoFormatado}
                      </span>
                    </div>

                    {/* Contador */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="text-xs text-slate-500 font-medium">Quantidade:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.id, -1)}
                          disabled={qtd === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-navy">
                          {qtd}
                        </span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.id, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy font-bold text-white hover:bg-navy-light transition-all shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Serviços Adicionais */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>⚙️</span> Serviços Adicionais
              </h2>
            </div>

            <div className="space-y-3">
              {/* Opção especial: Desmontagem de Móvel */}
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={desmontagemAtiva}
                  onChange={(e) => setDesmontagemAtiva(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
                />
                <div className="flex-1 text-sm">
                  <div className="flex justify-between items-center font-semibold text-slate-800">
                    <span>Desmontagem de móvel no local</span>
                    <span className="text-xs font-bold text-navy bg-gold/20 px-2 py-0.5 rounded">
                      +50% do valor da montagem
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Marque se houver móveis a serem desmontados antes da montagem nova.
                  </p>
                </div>
              </label>

              {/* Outros adicionais */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {adicionais
                  .filter((a) => a.id !== "a1")
                  .map((item) => {
                    const qtd = quantidades[item.id] || 0;
                    const ativo = qtd > 0;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-xl border p-3 text-sm transition-all ${
                          ativo ? "border-gold bg-amber-50/40 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex-1 pr-2">
                          <p className="font-medium text-xs text-slate-800">{item.nome}</p>
                          <span className="text-[11px] font-bold text-slate-600">{item.precoFormatado}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(item.id, -1)}
                            disabled={qtd === 0}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-600 disabled:opacity-30"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-navy">{qtd}</span>
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(item.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-navy text-xs font-bold text-white hover:bg-navy-light"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 3: Resumo, Dados do Cliente e Envio */}
        <div className="space-y-6">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg space-y-6">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span>📋</span> Resumo da Solicitação
            </h2>

            {itensSelecionados.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                Nenhum móvel selecionado ainda. Clique no <strong>+</strong> nos itens ao lado para adicionar ao orçamento.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {itensSelecionados.map((it) => (
                  <div key={it.item.id} className="flex justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
                    <span>
                      {it.quantidade}x {it.item.nome}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {it.item.precoBase ? formatarMoeda(it.item.precoBase * it.quantidade) : "A combinar"}
                    </span>
                  </div>
                ))}
                {desmontagemAtiva && (
                  <div className="flex justify-between text-xs text-slate-700 py-1 border-b border-slate-100 font-medium">
                    <span>Desmontagem (+50%)</span>
                    <span className="font-semibold text-slate-900">{formatarMoeda(valorDesmontagem)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="rounded-xl bg-navy p-4 text-white">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-wide text-slate-300 font-bold">
                  Estimativa a partir de
                </span>
                <span className="text-2xl font-black text-gold font-display">
                  {formatarMoeda(totalEstimado)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                * Valores base sujeitos a confirmação de acordo com complexidade e distância.
              </p>
            </div>

            {/* Formulário de Contato */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Seus Dados para Contato</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: (24) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bairro / Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Centro"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Volta Redonda"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes sobre o móvel, andar, etc."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                />
              </div>
            </div>

            {erro && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 font-medium border border-red-200">
                ⚠️ {erro}
              </div>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={enviando || totalItens === 0}
              className="w-full rounded-xl bg-gold py-3.5 text-center font-bold text-navy shadow-lg hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-all font-display uppercase tracking-wide"
            >
              {enviando ? "Enviando Solicitação…" : "🚀 Enviar Solicitação de Orçamento"}
            </button>
          </div>
        </div>
      </form>

      {/* Regras Comerciais */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-red-900 flex items-center gap-2">
          <span>📋</span> Regras Comerciais & Condições de Montagem
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 text-xs text-red-950/80">
          {regrasComerciais.map((regra, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-red-600 font-bold">✔</span>
              <span>{regra}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Banner de Compromisso Montaki */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 p-4 text-slate-950 font-black text-center shadow-lg border border-amber-300 font-display tracking-widest text-sm sm:text-base flex items-center justify-center gap-3">
        <span>🔧</span>
        <span>QUALIDADE</span>
        <span className="text-red-600">•</span>
        <span>SEGURANÇA</span>
        <span className="text-red-600">•</span>
        <span>AGILIDADE</span>
        <span>🔧</span>
      </div>
    </div>
  );
}
