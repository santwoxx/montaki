"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  COLECOES,
  atualizarDocumento,
  buscarOrcamento,
  criarDocumento,
  removerDocumento,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { ItemOrcamento, StatusOrcamento } from "@/lib/tipos";

export type SolicitacaoOrcamentoInput = {
  cliente: string;
  telefone: string;
  endereco?: string;
  cidade?: string;
  observacoes?: string;
  itens: ItemOrcamento[];
  total: number;
  fotos?: string[];
};

/**
 * Ação pública: permite que clientes solicitem orçamento diretamente pelo link compartilhado.
 */
export async function solicitarOrcamentoPublicoAction(
  dados: SolicitacaoOrcamentoInput
): Promise<{ sucesso: boolean; id?: string; erro?: string }> {
  try {
    const cliente = String(dados.cliente || "").trim();
    const telefone = String(dados.telefone || "").trim();
    const endereco = String(dados.endereco || "").trim();
    const cidade = String(dados.cidade || "").trim();
    const observacoes = String(dados.observacoes || "").trim();
    const itens = Array.isArray(dados.itens) ? dados.itens : [];
    const total = Number(dados.total) || 0;
    const fotos = Array.isArray(dados.fotos) ? dados.fotos.filter(Boolean) : [];

    if (!cliente) {
      return { sucesso: false, erro: "Informe seu nome completo." };
    }

    const digitosTelefone = telefone.replace(/\D/g, "");
    if (!telefone || digitosTelefone.length < 10) {
      return {
        sucesso: false,
        erro: "Informe um número de WhatsApp válido com DDD (ex: 24 99999-9999).",
      };
    }

    if (itens.length === 0) {
      return {
        sucesso: false,
        erro: "Selecione ao menos um serviço ou adicione o móvel para o orçamento.",
      };
    }

    const id = await criarDocumento(COLECOES.orcamentos, {
      cliente,
      telefone,
      endereco: endereco || null,
      cidade: cidade || null,
      observacoes: observacoes || null,
      itens,
      total,
      origem: "CLIENTE",
      status: "PENDENTE",
      fotos: fotos.length > 0 ? fotos : null,
      respostaAdmin: null,
      criadoEm: new Date(),
      validoAte: null,
    });

    revalidatePath("/admin/orcamentos");
    revalidatePath("/admin");

    return { sucesso: true, id };
  } catch (error) {
    console.error("Erro ao registrar solicitação de orçamento:", error);
    return {
      sucesso: false,
      erro: "Não foi possível enviar sua solicitação. Tente novamente.",
    };
  }
}

/**
 * Ação de administrador: atualiza o status de um orçamento (PENDENTE, APROVADO, REJEITADO).
 */
export async function atualizarStatusOrcamentoAction(
  id: string,
  status: StatusOrcamento
) {
  await requireAdmin();

  await atualizarDocumento(COLECOES.orcamentos, id, {
    status,
  });

  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath(`/orcamento/${id}`);
}

/**
 * Ação de administrador: define ou ajusta o preço total do orçamento (ex: após avaliar fotos enviadas pelo cliente).
 */
export async function definirPrecoOrcamentoAction(
  orcamentoId: string,
  novoTotal: number,
  observacoesAdmin?: string
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    await requireAdmin();

    const orcamento = await buscarOrcamento(orcamentoId);
    if (!orcamento) {
      return { sucesso: false, erro: "Orçamento não encontrado." };
    }

    const totalValido = Math.max(0, Number(novoTotal) || 0);

    const dadosAtualizacao: Record<string, unknown> = {
      total: totalValido,
    };

    if (observacoesAdmin !== undefined) {
      dadosAtualizacao.observacoes = observacoesAdmin || null;
    }

    await atualizarDocumento(COLECOES.orcamentos, orcamentoId, dadosAtualizacao);

    revalidatePath("/admin/orcamentos");
    revalidatePath(`/admin/orcamentos/${orcamentoId}`);
    revalidatePath(`/orcamento/${orcamentoId}`);

    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao definir preço do orçamento:", error);
    return { sucesso: false, erro: "Erro ao salvar novo valor do orçamento." };
  }
}

/**
 * Ação de administrador: registra o envio da mensagem com proposta de preço no WhatsApp.
 */
export async function registrarEnvioWhatsAppAction(
  orcamentoId: string,
  valorProposto: number,
  mensagem: string
) {
  await requireAdmin();

  await atualizarDocumento(COLECOES.orcamentos, orcamentoId, {
    respostaAdmin: {
      valorProposto: Number(valorProposto) || 0,
      mensagem: String(mensagem || ""),
      enviadoEm: new Date(),
    },
  });

  revalidatePath(`/admin/orcamentos/${orcamentoId}`);
  revalidatePath("/admin/orcamentos");
}

/**
 * Ação de administrador: exclui um orçamento do sistema.
 */
export async function excluirOrcamentoAction(id: string) {
  await requireAdmin();

  await removerDocumento(COLECOES.orcamentos, id);

  revalidatePath("/admin/orcamentos");
  redirect(`/admin/orcamentos?sucesso=${encodeURIComponent("Orçamento excluído com sucesso.")}`);
}

/**
 * Ação de administrador: transforma uma solicitação de orçamento em uma Montagem ativa.
 */
export async function converterOrcamentoEmMontagemAction(
  orcamentoId: string,
  formData: FormData
) {
  await requireAdmin();

  const orcamento = await buscarOrcamento(orcamentoId);
  if (!orcamento) {
    redirect(`/admin/orcamentos?erro=${encodeURIComponent("Orçamento não encontrado.")}`);
  }

  const lojaId = String(formData.get("lojaId") || "").trim();
  const montadorId = String(formData.get("montadorId") || "").trim() || null;
  const dataAgendadaStr = String(formData.get("dataAgendada") || "").trim();
  const valorServicoBruto = Number(formData.get("valorServico")) || orcamento.total;

  if (!lojaId) {
    redirect(`/admin/orcamentos/${orcamentoId}?erro=${encodeURIComponent("Selecione a loja parceira ou 'Cliente Direto'.")}`);
  }

  if (!dataAgendadaStr) {
    redirect(`/admin/orcamentos/${orcamentoId}?erro=${encodeURIComponent("Informe a data agendada para a montagem.")}`);
  }

  // Monta a descrição dos serviços a partir dos itens do orçamento
  const descricaoItens = orcamento.itens.length > 0
    ? orcamento.itens.map((it) => `${it.quantidade}x ${it.nome}`).join(", ")
    : "Montagem de móveis";

  const observacoesCompletas = [
    orcamento.observacoes ? `Observações do cliente: ${orcamento.observacoes}` : null,
    `Criado a partir do Orçamento #${orcamento.id.slice(0, 7)}`,
  ]
    .filter(Boolean)
    .join(" | ");

  const fotoPrincipal = orcamento.fotos && orcamento.fotos.length > 0 ? orcamento.fotos[0] : null;

  const agora = new Date();
  const montagemId = await criarDocumento(COLECOES.montagens, {
    lojaId,
    montadorId,
    clienteNome: orcamento.cliente || "Cliente",
    clienteTelefone: orcamento.telefone || null,
    clienteEndereco: orcamento.endereco || "A combinar",
    numeroPedido: null,
    descricaoServico: descricaoItens,
    observacoes: observacoesCompletas || null,
    valorServico: valorServicoBruto,
    valorAssistencia: 0,
    percentualMontador: 0,
    valorMontador: 0,
    feitoPorAdm: false,
    dataAgendada: new Date(dataAgendadaStr + "T12:00:00"),
    status: "PENDENTE",
    pagoPelaLoja: false,
    pagoAoMontador: false,
    concluidoEm: null,
    fotoProdutoUrl: fotoPrincipal,
    assinaturaMontador: null,
    assinaturaCliente: null,
    manualUrl: null,
    manualNomeArquivo: null,
    manualTipo: null,
    notificadoCentralSyncEm: null,
    avaliacaoSolicitadaEm: null,
    orcamentoId: orcamento.id,
    createdAt: agora,
    updatedAt: agora,
  });

  // Marca o orçamento como APROVADO
  await atualizarDocumento(COLECOES.orcamentos, orcamentoId, {
    status: "APROVADO",
  });

  revalidatePath("/admin/montagens");
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${orcamentoId}`);

  redirect(
    `/admin/montagens/${montagemId}?sucesso=${encodeURIComponent(
      "Montagem criada a partir do orçamento com sucesso!"
    )}`
  );
}
