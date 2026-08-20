"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  COLECOES,
  atualizarDocumento,
  criarDocumento,
  removerDocumento,
} from "@/lib/db";
import { firestore } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth";
import { formatarPrecoServico, tabelaPrecos } from "@/lib/tabelaPrecos";
import { paraNumeroBr } from "@/lib/format";
import type { CategoriaServico } from "@/lib/tipos";

function extrairPreco(valor: FormDataEntryValue | null): number | null {
  const str = String(valor ?? "").trim();
  if (!str) return null;
  const num = paraNumeroBr(str);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export async function criarServicoAction(formData: FormData) {
  await requireAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const categoriaBruta = String(formData.get("categoria") || "Principal").trim();
  const categoria: CategoriaServico = categoriaBruta === "Adicional" ? "Adicional" : "Principal";
  const observacao = String(formData.get("observacao") || "").trim() || null;
  const sufixo = String(formData.get("sufixo") || "").trim() || undefined; // ex: "+", "/un.", "/km"
  const precoCustomizadoTexto = String(formData.get("precoFormatado") || "").trim();

  if (!nome) {
    redirect(
      `/admin/servicos?erro=${encodeURIComponent("Informe o nome do móvel ou serviço.")}`
    );
  }

  const precoBase = extrairPreco(formData.get("precoBase"));
  const precoFormatado =
    precoCustomizadoTexto || formatarPrecoServico(precoBase, sufixo);

  const agora = new Date();

  await criarDocumento(COLECOES.servicos, {
    nome,
    categoria,
    precoBase,
    precoFormatado,
    observacao,
    ativo: true,
    ordem: 999,
    criadoEm: agora,
    atualizadoEm: agora,
  });

  revalidatePath("/admin/servicos");
  revalidatePath("/tabela-precos");
  revalidatePath("/orcamento/solicitar");
  revalidatePath("/solicitar-orcamento");

  redirect(
    `/admin/servicos?sucesso=${encodeURIComponent("Item de montagem cadastrado com sucesso!")}`
  );
}

export async function atualizarServicoAction(id: string, formData: FormData) {
  await requireAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const categoriaBruta = String(formData.get("categoria") || "Principal").trim();
  const categoria: CategoriaServico = categoriaBruta === "Adicional" ? "Adicional" : "Principal";
  const observacao = String(formData.get("observacao") || "").trim() || null;
  const ativo = formData.get("ativo") === "on" || formData.get("ativo") === "true";
  const precoCustomizadoTexto = String(formData.get("precoFormatado") || "").trim();

  if (!nome) {
    redirect(
      `/admin/servicos?erro=${encodeURIComponent("Informe o nome do móvel ou serviço.")}`
    );
  }

  const precoBase = extrairPreco(formData.get("precoBase"));
  const precoFormatado =
    precoCustomizadoTexto || formatarPrecoServico(precoBase);

  await atualizarDocumento(COLECOES.servicos, id, {
    nome,
    categoria,
    precoBase,
    precoFormatado,
    observacao,
    ativo,
    atualizadoEm: new Date(),
  });

  revalidatePath("/admin/servicos");
  revalidatePath("/tabela-precos");
  revalidatePath("/orcamento/solicitar");
  revalidatePath("/solicitar-orcamento");

  redirect(
    `/admin/servicos?sucesso=${encodeURIComponent("Item atualizado com sucesso!")}`
  );
}

export async function excluirServicoAction(id: string) {
  await requireAdmin();

  await removerDocumento(COLECOES.servicos, id);

  revalidatePath("/admin/servicos");
  revalidatePath("/tabela-precos");
  revalidatePath("/orcamento/solicitar");
  revalidatePath("/solicitar-orcamento");

  redirect(
    `/admin/servicos?sucesso=${encodeURIComponent("Item removido com sucesso!")}`
  );
}

export async function restaurarTabelaPadraoAction() {
  await requireAdmin();

  const db = firestore();
  const agora = new Date();
  const lote = db.batch();

  // Recria/sobrescreve todos os itens padrão
  tabelaPrecos.forEach((item, index) => {
    const ref = db.collection(COLECOES.servicos).doc(item.id);
    lote.set(ref, {
      nome: item.nome,
      precoBase: item.precoBase,
      precoFormatado: item.precoFormatado,
      categoria: item.categoria,
      observacao: item.observacao ?? null,
      ativo: true,
      ordem: index,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  });

  await lote.commit();

  revalidatePath("/admin/servicos");
  revalidatePath("/tabela-precos");
  revalidatePath("/orcamento/solicitar");
  revalidatePath("/solicitar-orcamento");

  redirect(
    `/admin/servicos?sucesso=${encodeURIComponent("Tabela padrão restaurada com sucesso!")}`
  );
}
