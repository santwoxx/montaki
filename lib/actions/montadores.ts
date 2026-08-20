"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  COLECOES,
  atualizarDocumento,
  buscarUsuario,
  buscarUsuarioPorEmail,
  criarDocumento,
  idComissao,
  listarAvaliacoesDoMontador,
  listarComissoesDoMontador,
  listarLojas,
  listarMontagensDoMontador,
  removerDocumento,
  removerVarios,
} from "@/lib/db";
import { firestore } from "@/lib/firebase/admin";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { paraNumeroBr } from "@/lib/format";
import type { Vinculo } from "@/lib/tipos";

function percentualValido(valor: FormDataEntryValue | null | undefined) {
  const numero = paraNumeroBr(valor?.toString() || "0");
  if (!Number.isFinite(numero) || numero < 0) return 0;
  return Math.min(100, numero);
}

function vinculoDoFormulario(formData: FormData): Vinculo {
  return formData.get("vinculo") === "COLABORADOR" ? "COLABORADOR" : "FUNCIONARIO";
}

export async function criarMontadorAction(formData: FormData) {
  await requireAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") || "").trim();
  const senha = String(formData.get("senha") || "");
  const vinculo = vinculoDoFormulario(formData);
  const comissao = percentualValido(formData.get("comissao"));

  if (!nome || !email || !senha) {
    redirect(
      `/admin/montadores?erro=${encodeURIComponent("Preencha nome, e-mail e senha.")}`
    );
  }
  if (senha.length < 6) {
    redirect(
      `/admin/montadores?erro=${encodeURIComponent(
        "A senha deve ter pelo menos 6 caracteres."
      )}`
    );
  }

  const existente = await buscarUsuarioPorEmail(email);
  if (existente) {
    redirect(
      `/admin/montadores?erro=${encodeURIComponent(
        "Já existe um usuário cadastrado com este e-mail."
      )}`
    );
  }

  await criarDocumento(COLECOES.usuarios, {
    nome,
    email,
    telefone: telefone || null,
    fotoUrl: null,
    senha: await hashPassword(senha),
    role: "MONTADOR",
    vinculo,
    ativo: true,
    comissaoPadrao: comissao,
    googleUid: null,
    createdAt: new Date(),
  });

  revalidatePath("/admin/montadores");
  redirect(
    `/admin/montadores?sucesso=${encodeURIComponent(
      `${nome} cadastrado(a) com sucesso.`
    )}`
  );
}

export async function atualizarMontadorAction(id: string, formData: FormData) {
  await requireAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") || "").trim();
  const novaSenha = String(formData.get("senha") || "");
  const ativo = formData.get("ativo") === "on";
  const vinculo = vinculoDoFormulario(formData);
  const comissaoPadrao = percentualValido(formData.get("comissaoPadrao"));

  if (!nome || !email) {
    redirect(
      `/admin/montadores/${id}?erro=${encodeURIComponent("Preencha nome e e-mail.")}`
    );
  }

  if (novaSenha && novaSenha.length < 6) {
    redirect(
      `/admin/montadores/${id}?erro=${encodeURIComponent(
        "A nova senha deve ter pelo menos 6 caracteres."
      )}`
    );
  }

  const emailEmUso = await buscarUsuarioPorEmail(email);
  if (emailEmUso && emailEmUso.id !== id) {
    redirect(
      `/admin/montadores/${id}?erro=${encodeURIComponent(
        "Este e-mail já está em uso por outro usuário."
      )}`
    );
  }

  await atualizarDocumento(COLECOES.usuarios, id, {
    nome,
    email,
    telefone: telefone || null,
    ativo,
    vinculo,
    comissaoPadrao,
    ...(novaSenha ? { senha: await hashPassword(novaSenha) } : {}),
  });

  revalidatePath("/admin/montadores");
  revalidatePath(`/admin/montadores/${id}`);
  redirect(
    `/admin/montadores/${id}?sucesso=${encodeURIComponent("Dados atualizados.")}`
  );
}

export async function salvarComissoesAction(montadorId: string, formData: FormData) {
  await requireAdmin();

  const lojas = await listarLojas();
  const db = firestore();
  const lote = db.batch();

  for (const loja of lojas) {
    const percentual = percentualValido(formData.get(`percentual_${loja.id}`));
    // Id determinístico (montador + loja): grava por cima da comissão
    // anterior em vez de criar uma segunda para o mesmo par, que era o que
    // a chave única do Postgres garantia.
    lote.set(
      db.collection(COLECOES.comissoes).doc(idComissao(montadorId, loja.id)),
      { montadorId, lojaId: loja.id, percentual }
    );
  }

  await lote.commit();

  revalidatePath(`/admin/montadores/${montadorId}`);
  revalidatePath("/montador/perfil");
  redirect(
    `/admin/montadores/${montadorId}?sucesso=${encodeURIComponent(
      "Comissões atualizadas."
    )}`
  );
}

export async function excluirMontadorAction(id: string) {
  await requireAdmin();

  const montador = await buscarUsuario(id);
  if (!montador || montador.role !== "MONTADOR") {
    redirect(`/admin/montadores?erro=${encodeURIComponent("Cadastro não encontrado.")}`);
  }

  // Avaliação é histórico de cliente: apagar o montador levaria junto a nota
  // que ele recebeu. O Postgres barrava isso por chave estrangeira; aqui a
  // checagem é explícita.
  const avaliacoes = await listarAvaliacoesDoMontador(id);
  if (avaliacoes.length > 0) {
    redirect(
      `/admin/montadores?erro=${encodeURIComponent(
        "Esse montador já tem avaliações registradas e não pode ser excluído. Desative-o em vez disso."
      )}`
    );
  }

  // As montagens ficam, sem montador designado (era o "onDelete: SetNull").
  const montagens = await listarMontagensDoMontador(id);
  const db = firestore();
  if (montagens.length > 0) {
    const lote = db.batch();
    for (const montagem of montagens) {
      lote.update(db.collection(COLECOES.montagens).doc(montagem.id), {
        montadorId: null,
      });
    }
    await lote.commit();
  }

  const comissoes = await listarComissoesDoMontador(id);
  await removerVarios(
    COLECOES.comissoes,
    comissoes.map((c) => c.id)
  );

  await removerDocumento(COLECOES.usuarios, id);

  revalidatePath("/admin/montadores");
  revalidatePath("/admin/montagens");
  redirect(`/admin/montadores?sucesso=${encodeURIComponent("Cadastro excluído.")}`);
}
