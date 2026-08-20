"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  COLECOES,
  atualizarMontagem,
  buscarAvaliacaoDaMontagem,
  buscarMontagem,
  criarDocumentoExclusivo,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apenasDigitos } from "@/lib/format";
import { obterUrlBase } from "@/lib/urlBase";

/**
 * Gera o link de avaliação e a mensagem de WhatsApp para o cliente, e
 * registra que o pedido de avaliação foi enviado. Usada pelo botão de
 * "concluído" do montador (e também disponível para o admin).
 */
export async function gerarLinkAvaliacaoAction(
  id: string
): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const montagem = await buscarMontagem(id);
  if (!montagem) return { ok: false, erro: "Montagem não encontrada." };
  if (session.role === "MONTADOR" && montagem.montadorId !== session.sub) {
    return { ok: false, erro: "Você não tem acesso a esta montagem." };
  }
  if (montagem.status !== "CONCLUIDO") {
    return { ok: false, erro: "Conclua a montagem antes de pedir a avaliação." };
  }
  if (!montagem.montadorId) {
    return { ok: false, erro: "Esta montagem não tem um montador definido." };
  }
  if (!montagem.clienteTelefone) {
    return {
      ok: false,
      erro: "Cadastre o telefone do cliente para enviar o link de avaliação.",
    };
  }

  const baseUrl = await obterUrlBase();
  const linkAvaliacao = `${baseUrl}/avaliar/${montagem.id}`;

  await atualizarMontagem(id, { avaliacaoSolicitadaEm: new Date() });

  revalidatePath(`/montador/montagens/${id}`);
  revalidatePath(`/admin/montagens/${id}`);

  const primeiroNome = montagem.clienteNome.split(" ")[0];
  const mensagem =
    `Olá, ${primeiroNome}! Aqui é da equipe de montagem. 🛠️\n\n` +
    `Seu serviço foi concluído com sucesso! Poderia avaliar o atendimento do ` +
    `nosso montador? É rapidinho, leva menos de 1 minuto:\n${linkAvaliacao}\n\n` +
    `Obrigado pela confiança! 🙏`;

  const digitos = apenasDigitos(montagem.clienteTelefone);
  const comCodigoPais = digitos.startsWith("55") ? digitos : `55${digitos}`;
  const url = `https://wa.me/${comCodigoPais}?text=${encodeURIComponent(mensagem)}`;

  return { ok: true, url };
}

/**
 * Recebe a avaliação enviada pelo cliente na página pública /avaliar/[id].
 * Não exige login: a proteção é o próprio id (não enumerável) da montagem,
 * mais a checagem de status e a restrição de uma avaliação por montagem.
 */
export async function enviarAvaliacaoAction(id: string, formData: FormData) {
  const erro = (mensagem: string) =>
    redirect(`/avaliar/${id}?erro=${encodeURIComponent(mensagem)}`);

  const montagem = await buscarMontagem(id);
  if (!montagem || montagem.status !== "CONCLUIDO" || !montagem.montadorId) {
    erro("Este link de avaliação não está mais disponível.");
    return;
  }

  const jaAvaliada = await buscarAvaliacaoDaMontagem(id);
  if (jaAvaliada) {
    redirect(`/avaliar/${id}`);
    return;
  }

  const estrelasBrutas = Number(formData.get("estrelas"));
  if (!Number.isFinite(estrelasBrutas) || estrelasBrutas < 1) {
    erro("Escolha de 1 a 5 estrelas antes de enviar.");
    return;
  }
  const estrelas = Math.min(5, Math.max(1, Math.round(estrelasBrutas)));

  const comentarioBruto = String(formData.get("comentario") || "").trim();
  const comentario = comentarioBruto ? comentarioBruto.slice(0, 500) : null;

  const montadorId = montagem.montadorId;

  try {
    // O id do documento é o id da montagem: uma avaliação por montagem, e a
    // segunda tentativa falha aqui em vez de sobrescrever a primeira.
    await criarDocumentoExclusivo(COLECOES.avaliacoes, id, {
      montagemId: id,
      montadorId,
      estrelas,
      comentario,
      criadoEm: new Date(),
    });
  } catch {
    // Duas tentativas quase simultâneas: a primeira já gravou. Segue para a
    // tela de agradecimento.
  }

  revalidatePath(`/admin/montadores/${montadorId}`);
  revalidatePath("/admin/montadores");
  revalidatePath("/montador");
  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath(`/montador/montagens/${id}`);

  redirect(`/avaliar/${id}`);
}
