"use client";

import { useState } from "react";
import { formatarMoeda, formatarData } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import {
  definirPrecoOrcamentoAction,
  registrarEnvioWhatsAppAction,
} from "@/lib/actions/orcamentos";
import type { Orcamento } from "@/lib/tipos";

export default function AdminOrcamentoDetalhesClient({
  orcamento,
  linkPublico,
}: {
  orcamento: Orcamento;
  linkPublico: string;
}) {
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  // Precificação
  const [valorFinal, setValorFinal] = useState<string>(
    orcamento.total > 0
      ? orcamento.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : ""
  );
  const [salvandoPreco, setSalvandoPreco] = useState(false);
  const [precoSalvoSucesso, setPrecoSalvoSucesso] = useState(false);

  const telLimpo = (orcamento.telefone || "").replace(/\D/g, "");

  // Gera texto padrão formatado para os itens
  const resumoItens = (orcamento.itens || [])
    .map((it) => `• ${it.quantidade}x ${it.nome}`)
    .join("\n");

  const valorNumerico = parseFloat(valorFinal.replace(/\./g, "").replace(",", ".")) || orcamento.total;

  const [mensagemPersonalizada, setMensagemPersonalizada] = useState<string>(
    `Olá ${orcamento.cliente || "Cliente"}! Tudo bem? Aqui é da Montaki Montagem de Móveis 🔨\n\n` +
      `Recebemos sua solicitação de orçamento (Protocolo: #${orcamento.id.slice(0, 7).toUpperCase()}).\n\n` +
      `📋 *Móveis avaliados:*\n${resumoItens || "• Serviços de montagem"}\n\n` +
      `💰 *Valor da montagem:* ${formatarMoeda(valorNumerico)}\n\n` +
      `🔗 *Acesse o orçamento online detalhado:* ${linkPublico}\n\n` +
      `Podemos agendar para qual dia e horário fica melhor para você?`
  );

  const salvarPreco = async () => {
    setSalvandoPreco(true);
    setPrecoSalvoSucesso(false);
    try {
      const valor = parseFloat(valorFinal.replace(/\./g, "").replace(",", ".")) || 0;
      const res = await definirPrecoOrcamentoAction(orcamento.id, valor);
      if (res.sucesso) {
        setPrecoSalvoSucesso(true);
        setTimeout(() => setPrecoSalvoSucesso(false), 3000);
      } else {
        alert(res.erro || "Erro ao salvar preço.");
      }
    } finally {
      setSalvandoPreco(false);
    }
  };

  const handleAbrirWhatsApp = async () => {
    const valor = parseFloat(valorFinal.replace(/\./g, "").replace(",", ".")) || orcamento.total;
    
    // Atualiza o preço no banco se foi alterado
    if (valor !== orcamento.total) {
      await definirPrecoOrcamentoAction(orcamento.id, valor);
    }

    // Registra o envio
    await registrarEnvioWhatsAppAction(orcamento.id, valor, mensagemPersonalizada);

    // Abre o WhatsApp
    const url = `https://wa.me/55${telLimpo}?text=${encodeURIComponent(mensagemPersonalizada)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* SEÇÃO: FOTOS DO MÓVEL ANEXADAS PELO CLIENTE */}
      {orcamento.fotos && orcamento.fotos.length > 0 && (
        <Card className="border-2 border-amber-300 bg-amber-50/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📸</span>
              <div>
                <h3 className="font-bold text-slate-900 text-base font-display">
                  Fotos Anexadas pelo Cliente ({orcamento.fotos.length})
                </h3>
                <p className="text-xs text-slate-600">
                  Clique na foto para visualizar em tamanho ampliado e avaliar a complexidade do móvel.
                </p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-900 border-amber-300">
              {orcamento.fotos.length} Imagem(ns)
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {orcamento.fotos.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setFotoModalUrl(url)}
                className="group relative aspect-square rounded-xl overflow-hidden border-2 border-amber-300/80 bg-slate-100 cursor-pointer shadow-xs hover:border-gold hover:shadow-md transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Foto do móvel ${idx + 1}`}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                  🔍 Ampliar
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SEÇÃO: DEFINIR PREÇO E RESPONDER NO WHATSAPP */}
      <Card className="border-2 border-[#25D366]/40 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50 p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-display">
                Precificar & Responder no WhatsApp
              </h3>
              <p className="text-xs text-slate-500">
                Defina o valor da montagem e envie a proposta formatada diretamente para o WhatsApp do cliente.
              </p>
            </div>
          </div>

          {orcamento.respostaAdmin?.enviadoEm && (
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
              ✓ Proposta enviada em {formatarData(orcamento.respostaAdmin.enviadoEm)}
            </span>
          )}
        </div>

        {/* Campo de Definição de Preço */}
        <div className="grid gap-4 sm:grid-cols-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Valor Total da Montagem (R$)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-navy">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={valorFinal}
                onChange={(e) => {
                  setValorFinal(e.target.value);
                  // Atualiza mensagem
                  const val = parseFloat(e.target.value.replace(/\./g, "").replace(",", ".")) || 0;
                  setMensagemPersonalizada(
                    `Olá ${orcamento.cliente || "Cliente"}! Tudo bem? Aqui é da Montaki Montagem de Móveis 🔨\n\n` +
                      `Recebemos sua solicitação de orçamento (Protocolo: #${orcamento.id.slice(0, 7).toUpperCase()}).\n\n` +
                      `📋 *Móveis avaliados:*\n${resumoItens || "• Serviços de montagem"}\n\n` +
                      `💰 *Valor da montagem:* ${formatarMoeda(val)}\n\n` +
                      `🔗 *Acesse o orçamento online detalhado:* ${linkPublico}\n\n` +
                      `Podemos agendar para qual dia e horário fica melhor para você?`
                  );
                }}
                placeholder="Ex: 150,00"
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-base font-extrabold text-navy focus:border-gold focus:outline-none"
              />
              <button
                type="button"
                onClick={salvarPreco}
                disabled={salvandoPreco}
                className="shrink-0 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-light disabled:opacity-50 transition-colors shadow-xs"
              >
                {salvandoPreco ? "Salvando..." : precoSalvoSucesso ? "✓ Salvo!" : "Salvar Preço"}
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-xs text-slate-500">Telefone / WhatsApp do Cliente:</span>
            <span className="text-base font-bold text-emerald-800 font-mono">
              {orcamento.telefone ? `📞 ${orcamento.telefone}` : "Não informado"}
            </span>
          </div>
        </div>

        {/* Editor da Mensagem do WhatsApp */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 flex justify-between items-center">
            <span>Mensagem Pré-Preenchida para o WhatsApp:</span>
            <span className="text-[11px] text-slate-400 font-normal">
              Você pode editar o texto antes de enviar
            </span>
          </label>
          <textarea
            rows={7}
            value={mensagemPersonalizada}
            onChange={(e) => setMensagemPersonalizada(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-sans text-slate-800 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none leading-relaxed"
          />
        </div>

        {/* Botão de Envio WhatsApp */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            Ao clicar, o WhatsApp Web ou aplicativo será aberto com a mensagem pronta para enviar ao cliente.
          </p>

          <button
            type="button"
            onClick={handleAbrirWhatsApp}
            disabled={!telLimpo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#1EBE5D] disabled:opacity-50 transition-all font-display uppercase tracking-wide shrink-0"
          >
            <span>💬 Abrir WhatsApp e Enviar Preço</span>
          </button>
        </div>
      </Card>

      {/* MODAL: VISUALIZADOR DE FOTO EXPANDIDA */}
      {fotoModalUrl && (
        <div
          onClick={() => setFotoModalUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoModalUrl}
              alt="Foto ampliada do móvel"
              className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl"
            />
            <button
              onClick={() => setFotoModalUrl(null)}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white font-bold text-lg hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
