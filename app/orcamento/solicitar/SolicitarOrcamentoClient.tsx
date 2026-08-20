"use client";

import { useState } from "react";
import Link from "next/link";
import { tabelaPrecos, regrasComerciais } from "@/lib/tabelaPrecos";
import { solicitarOrcamentoPublicoAction } from "@/lib/actions/orcamentos";
import { formatarMoeda } from "@/lib/format";
import { Logo } from "@/components/Logo";
import type { ItemTabelaPreco } from "@/lib/tipos";

type ItemPersonalizado = {
  id: string;
  nome: string;
  quantidade: number;
  observacao?: string;
};

type FotoAnexada = {
  id: string;
  file?: File;
  previewUrl: string;
  urlFinal?: string;
};

type ItemSelecionado = {
  item: ItemTabelaPreco;
  quantidade: number;
};

function formatarTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
}

export default function SolicitarOrcamentoClient({
  servicosIniciais,
}: {
  servicosIniciais?: ItemTabelaPreco[];
}) {
  const listaServicos =
    servicosIniciais && servicosIniciais.length > 0 ? servicosIniciais : tabelaPrecos;

  const principais = listaServicos.filter((item) => item.categoria === "Principal");
  const adicionais = listaServicos.filter((item) => item.categoria === "Adicional");

  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [desmontagemAtiva, setDesmontagemAtiva] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");

  // Móveis personalizados (fora da lista)
  const [itensPersonalizados, setItensPersonalizados] = useState<ItemPersonalizado[]>([]);
  const [mostrarFormPersonalizado, setMostrarFormPersonalizado] = useState(false);
  const [nomePersonalizado, setNomePersonalizado] = useState("");
  const [qtdPersonalizado, setQtdPersonalizado] = useState(1);
  const [obsPersonalizado, setObsPersonalizado] = useState("");

  // Fotos anexadas
  const [fotos, setFotos] = useState<FotoAnexada[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);

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

  const adicionarItemPersonalizado = () => {
    if (!nomePersonalizado.trim()) return;
    const novoItem: ItemPersonalizado = {
      id: `custom_${Date.now()}`,
      nome: nomePersonalizado.trim(),
      quantidade: Math.max(1, qtdPersonalizado),
      observacao: obsPersonalizado.trim() || undefined,
    };
    setItensPersonalizados((prev) => [...prev, novoItem]);
    setNomePersonalizado("");
    setQtdPersonalizado(1);
    setObsPersonalizado("");
    setMostrarFormPersonalizado(false);
  };

  const removerItemPersonalizado = (id: string) => {
    setItensPersonalizados((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSelecionarFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const novas: FotoAnexada[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        novas.push({
          id: `foto_${Date.now()}_${i}`,
          file,
          previewUrl,
        });
      }
    }

    setFotos((prev) => [...prev, ...novas]);
    // limpa o input para permitir selecionar a mesma foto novamente se desejar
    e.target.value = "";
  };

  const removerFoto = (id: string) => {
    setFotos((prev) => {
      const foto = prev.find((f) => f.id === id);
      if (foto && foto.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(foto.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Itens selecionados da tabela padrão
  const itensSelecionados: ItemSelecionado[] = Object.entries(quantidades)
    .map(([id, qtd]) => {
      const item = listaServicos.find((p) => p.id === id);
      if (!item || qtd <= 0) return null;
      return { item, quantidade: qtd };
    })
    .filter((it): it is ItemSelecionado => it !== null);

  // Subtotal base dos serviços tabelados com preço definido
  const subtotalBase = itensSelecionados.reduce((acc, curr) => {
    if (curr.item.precoBase) {
      return acc + curr.item.precoBase * curr.quantidade;
    }
    return acc;
  }, 0);

  // Desmontagem (50% do valor da montagem se ativa)
  const valorDesmontagem = desmontagemAtiva ? subtotalBase * 0.5 : 0;
  const totalEstimado = subtotalBase + valorDesmontagem;

  const totalQtdItens =
    itensSelecionados.reduce((acc, curr) => acc + curr.quantidade, 0) +
    itensPersonalizados.reduce((acc, curr) => acc + curr.quantidade, 0);

  const temItensSobConsulta =
    itensPersonalizados.length > 0 ||
    itensSelecionados.some((it) => it.item.precoBase === null || it.item.precoBase === 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro("Por favor, preencha seu nome completo.");
      return;
    }

    const digitosTel = telefone.replace(/\D/g, "");
    if (!telefone.trim() || digitosTel.length < 10) {
      setErro("Por favor, informe seu WhatsApp com DDD (ex: 24 99999-9999) para receber o orçamento.");
      return;
    }

    if (totalQtdItens === 0 && fotos.length === 0) {
      setErro("Selecione ao menos um móvel ou anexe fotos do móvel para solicitar o orçamento.");
      return;
    }

    setEnviando(true);

    try {
      // 1. Faz upload das fotos anexadas
      setUploadingFoto(true);
      const urlsFotosFinais: string[] = [];

      for (const foto of fotos) {
        if (foto.urlFinal) {
          urlsFotosFinais.push(foto.urlFinal);
        } else if (foto.file) {
          const formDataFoto = new FormData();
          formDataFoto.append("file", foto.file);

          const resUpload = await fetch("/api/upload-orcamento", {
            method: "POST",
            body: formDataFoto,
          });

          if (resUpload.ok) {
            const dataUpload = await resUpload.json();
            if (dataUpload.url) {
              urlsFotosFinais.push(dataUpload.url);
            }
          }
        }
      }
      setUploadingFoto(false);

      // 2. Monta lista final de itens
      const listaFinal: Array<{
        servicoId?: string;
        nome: string;
        quantidade: number;
        valorUnitario: number | null;
        total: number | null;
        fotoUrl?: string | null;
        observacao?: string | null;
      }> = [];

      // Itens da tabela
      for (const it of itensSelecionados) {
        listaFinal.push({
          servicoId: it.item.id,
          nome: it.item.nome,
          quantidade: it.quantidade,
          valorUnitario: it.item.precoBase,
          total: it.item.precoBase ? it.item.precoBase * it.quantidade : null,
          observacao: it.item.observacao ?? null,
        });
      }

      // Itens personalizados
      for (const it of itensPersonalizados) {
        listaFinal.push({
          nome: `${it.nome} (Móvel sob avaliação)`,
          quantidade: it.quantidade,
          valorUnitario: null,
          total: null,
          observacao: it.observacao ?? null,
        });
      }

      // Se o cliente só enviou fotos e não adicionou nenhum item de texto, cria um item genérico
      if (listaFinal.length === 0 && urlsFotosFinais.length > 0) {
        listaFinal.push({
          nome: "Móvel conforme foto(s) anexada(s)",
          quantidade: 1,
          valorUnitario: null,
          total: null,
          observacao: "Avaliação do móvel via foto",
        });
      }

      // Desmontagem se ativa
      if (desmontagemAtiva && valorDesmontagem > 0) {
        listaFinal.push({
          servicoId: "a1",
          nome: "Desmontagem de móveis (50%)",
          quantidade: 1,
          valorUnitario: valorDesmontagem,
          total: valorDesmontagem,
        });
      }

      // 3. Envia o orçamento
      const res = await solicitarOrcamentoPublicoAction({
        cliente: nome.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim() || undefined,
        cidade: cidade.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        itens: listaFinal,
        total: totalEstimado,
        fotos: urlsFotosFinais,
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
      setUploadingFoto(false);
    }
  };

  const principaisFiltrados = principais.filter((item) =>
    item.nome.toLowerCase().includes(filtroBusca.toLowerCase())
  );

  // Mensagem pré-formatada para WhatsApp do cliente confirmar
  const textoItensMsg = [
    ...itensSelecionados.map((it) => `${it.quantidade}x ${it.item.nome}`),
    ...itensPersonalizados.map((it) => `${it.quantidade}x ${it.nome}`),
    desmontagemAtiva ? "Desmontagem de móveis" : null,
    fotos.length > 0 ? `(${fotos.length} foto(s) anexada(s))` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const mensagemWhatsApp = encodeURIComponent(
    `Olá Montaki! Acabei de solicitar um orçamento no site.\n\n` +
      `*Protocolo:* #${sucessoId?.slice(0, 7).toUpperCase()}\n` +
      `*Cliente:* ${nome}\n` +
      `*WhatsApp:* ${telefone}\n` +
      `*Itens:* ${textoItensMsg}\n` +
      (totalEstimado > 0 ? `*Valor estimado:* ${formatarMoeda(totalEstimado)}\n\n` : `*Aguardando avaliação dos móveis/fotos.*\n\n`) +
      `Gostaria de confirmar a disponibilidade e o valor final para agendarmos!`
  );

  if (sucessoId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-emerald-500/30 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">
            Orçamento Solicitado com Sucesso!
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            Recebemos sua solicitação de montagem. Nossa equipe já está analisando seus móveis e entrará em contato pelo seu WhatsApp <strong>{telefone}</strong> com a confirmação e valores!
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm border border-slate-200">
            <div className="flex justify-between font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-2">
              <span>Protocolo:</span>
              <span className="font-mono text-navy font-bold">#{sucessoId.slice(0, 7).toUpperCase()}</span>
            </div>
            <div className="space-y-1 text-slate-600 text-xs">
              <p><strong>Cliente:</strong> {nome}</p>
              <p><strong>WhatsApp para contato:</strong> {telefone}</p>
              {endereco && <p><strong>Endereço:</strong> {endereco} {cidade ? `- ${cidade}` : ""}</p>}
              
              <div className="pt-2">
                <strong className="text-slate-800">Móveis & Serviços Solicitados:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-700">
                  {itensSelecionados.map((it) => (
                    <li key={it.item.id}>
                      {it.quantidade}x {it.item.nome} ({it.item.precoFormatado})
                    </li>
                  ))}
                  {itensPersonalizados.map((it) => (
                    <li key={it.id} className="text-amber-800">
                      {it.quantidade}x {it.nome} (Sob Avaliação)
                    </li>
                  ))}
                  {desmontagemAtiva && <li>1x Desmontagem de móvel (+50%)</li>}
                </ul>
              </div>

              {fotos.length > 0 && (
                <div className="pt-2">
                  <p className="font-semibold text-slate-800">Fotos Enviadas ({fotos.length}):</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {fotos.map((f) => (
                      <div
                        key={f.id}
                        className="h-12 w-12 rounded-lg border border-slate-300 bg-cover bg-center overflow-hidden"
                        style={{ backgroundImage: `url(${f.previewUrl})` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2 font-bold text-sm text-navy">
                <span>{temItensSobConsulta ? "Estimativa Inicial:" : "Estimativa a partir de:"}</span>
                <span className="text-emerald-700 text-base">
                  {totalEstimado > 0 ? formatarMoeda(totalEstimado) : "Aguardando precificação"}
                </span>
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
              <span>💬 Confirmar no WhatsApp da Montaki</span>
            </a>
            <button
              onClick={() => {
                setSucessoId(null);
                setQuantidades({});
                setItensPersonalizados([]);
                setFotos([]);
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
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-8 space-y-6">
      {/* Header com identidade visual Montaki */}
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
              Solicitar Orçamento de Montagem
            </h1>
            <p className="text-sm text-amber-100/90 max-w-xl">
              Escolha seus móveis abaixo ou anexe fotos do seu móvel. Você receberá o valor no seu WhatsApp!
            </p>
          </div>
          <div className="shrink-0 flex flex-wrap gap-2 justify-center sm:justify-end">
            <Link
              href="/tabela-precos"
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 text-xs font-bold transition-all shadow-md font-display uppercase tracking-wide"
            >
              📋 Tabela de Preços
            </Link>
            <a
              href="https://wa.me/5524993210547?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20o%20atendente%20da%20Montaki%20sobre%20um%20or%C3%A7amento."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white px-3.5 py-2 text-xs font-bold transition-all shadow-md font-display uppercase tracking-wide"
            >
              <span>💬 Falar com Atendente</span>
            </a>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Coluna 1 & 2: Seleção de Móveis, Adicionais e Anexo de Foto */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Especial: Anexo de Fotos do Móvel (Caso não esteja na lista ou para avaliação) */}
          <div className="rounded-2xl border-2 border-dashed border-amber-400/80 bg-amber-50/40 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📸</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base font-display">
                    Seu móvel não está na lista ou quer avaliação por foto?
                  </h3>
                  <p className="text-xs text-slate-600">
                    Tire ou anexe fotos do seu móvel para avaliarmos o valor exato da montagem!
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-light cursor-pointer shadow-xs transition-all shrink-0">
                <span>📷 Anexar Foto</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleSelecionarFotos}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview das Fotos Anexadas */}
            {fotos.length > 0 && (
              <div className="pt-2 border-t border-amber-200/60">
                <p className="text-xs font-bold text-slate-700 mb-2">
                  Fotos Anexadas ({fotos.length}):
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {fotos.map((foto) => (
                    <div
                      key={foto.id}
                      className="relative h-20 w-20 rounded-xl border-2 border-amber-400 bg-cover bg-center shadow-xs overflow-hidden group"
                      style={{ backgroundImage: `url(${foto.previewUrl})` }}
                    >
                      <button
                        type="button"
                        onClick={() => removerFoto(foto.id)}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white font-bold text-xs shadow-md hover:bg-red-700"
                        title="Remover foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botão de Adicionar Móvel Personalizado com Nome */}
            {!mostrarFormPersonalizado ? (
              <button
                type="button"
                onClick={() => setMostrarFormPersonalizado(true)}
                className="text-xs font-bold text-navy hover:text-gold hover:underline inline-flex items-center gap-1 pt-1"
              >
                <span>+</span> Descrever móvel sob medida / personalizado
              </button>
            ) : (
              <div className="mt-3 rounded-xl bg-white p-3.5 border border-amber-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">
                    Descrever Móvel Fora da Lista
                  </span>
                  <button
                    type="button"
                    onClick={() => setMostrarFormPersonalizado(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Fechar
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Ex: Armário de canto sob medida, Beliche antiga..."
                      value={nomePersonalizado}
                      onChange={(e) => setNomePersonalizado(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={1}
                      value={qtdPersonalizado}
                      onChange={(e) => setQtdPersonalizado(Number(e.target.value))}
                      placeholder="Qtd"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Detalhes (ex: 3 portas, precisa fixar na parede...)"
                  value={obsPersonalizado}
                  onChange={(e) => setObsPersonalizado(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-gold focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={adicionarItemPersonalizado}
                    className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-light shadow-xs"
                  >
                    Adicionar ao Orçamento
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Busca rápida */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar móvel na lista (ex: Guarda-roupa, Cama, Painel, Cozinha)..."
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-xs focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none"
            />
          </div>

          {/* Serviços Principais */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
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
                        ? "border-gold bg-amber-50/40 shadow-xs"
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
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy font-bold text-white hover:bg-navy-light transition-all shadow-xs"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
                <span>⚙️</span> Serviços Adicionais
              </h2>
            </div>

            <div className="space-y-3">
              {/* Desmontagem */}
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
                          ativo ? "border-gold bg-amber-50/40 shadow-xs" : "border-slate-200 hover:bg-slate-50"
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

        {/* Coluna 3: Resumo, Dados Obrigatórios do Cliente e Envio */}
        <div className="space-y-6">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg space-y-5">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 font-display">
              <span>📋</span> Resumo do Orçamento
            </h2>

            {totalQtdItens === 0 && fotos.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                Nenhum móvel selecionado ainda. Clique no <strong>+</strong> nos móveis ao lado ou <strong>anexe uma foto</strong> para cotar.
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

                {itensPersonalizados.map((it) => (
                  <div key={it.id} className="flex justify-between items-center text-xs text-amber-900 py-1 border-b border-slate-100 bg-amber-50/60 px-2 rounded">
                    <span>
                      {it.quantidade}x {it.nome}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-amber-700">Sob Avaliação</span>
                      <button
                        type="button"
                        onClick={() => removerItemPersonalizado(it.id)}
                        className="text-rose-600 font-bold hover:text-rose-800"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {desmontagemAtiva && (
                  <div className="flex justify-between text-xs text-slate-700 py-1 border-b border-slate-100 font-medium">
                    <span>Desmontagem (+50%)</span>
                    <span className="font-semibold text-slate-900">{formatarMoeda(valorDesmontagem)}</span>
                  </div>
                )}

                {fotos.length > 0 && (
                  <div className="text-[11px] text-emerald-700 py-1 font-semibold flex items-center gap-1">
                    <span>📸</span> {fotos.length} foto(s) anexada(s) para avaliação
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="rounded-xl bg-navy p-4 text-white">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-wide text-slate-300 font-bold">
                  {temItensSobConsulta ? "Estimativa a partir de" : "Total Estimado"}
                </span>
                <span className="text-2xl font-black text-gold font-display">
                  {totalEstimado > 0 ? formatarMoeda(totalEstimado) : "Sob Consulta"}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-1">
                * O valor final oficial será confirmado no seu WhatsApp pela nossa equipe.
              </p>
            </div>

            {/* Formulário de Contato com WhatsApp Obrigatório */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Seus Dados de Contato</h3>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  * Campos Obrigatórios
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>WhatsApp / Celular *</span>
                  <span className="text-[10px] text-emerald-700 font-bold">💬 Resposta via WhatsApp</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(24) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  className="w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm font-bold focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  É obrigatório colocar seu número para que o administrador envie o preço e disponibilidade no WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bairro / Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Retiro"
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
                  placeholder="Ex: Casa com escada, móvel novo na caixa, etc."
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
              disabled={enviando || (totalQtdItens === 0 && fotos.length === 0)}
              className="w-full rounded-xl bg-gold py-3.5 text-center font-bold text-navy shadow-lg hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-all font-display uppercase tracking-wide text-sm"
            >
              {enviando || uploadingFoto
                ? "Enviando e Processando Fotos…"
                : "🚀 Enviar Solicitação de Orçamento"}
            </button>

            {/* Card Falar Diretamente com Atendente */}
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-center space-y-2">
              <p className="text-xs font-bold text-emerald-950">
                Prefere atendimento humano imediato?
              </p>
              <a
                href="https://wa.me/5524993210547?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20diretamente%20com%20o%20atendente%20da%20Montaki%20sobre%20um%20or%C3%A7amento."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] py-2.5 text-xs font-bold text-white shadow-xs transition-all font-display uppercase tracking-wide"
              >
                <span>💬 Falar com Atendente (24 99321-0547)</span>
              </a>
            </div>
          </div>
        </div>
      </form>

      {/* Regras Comerciais */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-6 shadow-xs space-y-4">
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

      {/* Botão Flutuante do WhatsApp para Falar com Atendente */}
      <aside aria-label="Atendimento no WhatsApp" className="fixed bottom-5 right-5 z-40">
        <a
          href="https://wa.me/5524993210547?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20o%20atendente%20da%20Montaki%20sobre%20or%C3%A7amento."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white px-4 py-3 shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white/40"
          title="Falar com Atendente no WhatsApp"
        >
          <span className="text-xl">💬</span>
          <span className="font-bold text-xs hidden sm:inline font-display uppercase tracking-wide">
            Falar com Atendente (24) 99321-0547
          </span>
        </a>
      </aside>
    </div>
  );
}
