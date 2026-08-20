"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  COLECOES,
  atualizarDocumento,
  buscarLojaPorCnpj,
  criarDocumento,
  listarMontagensDaLoja,
  removerDocumento,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizarCnpj } from "@/lib/cnpj";

export async function criarLojaAction(formData: FormData) {
  await requireAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const endereco = String(formData.get("endereco") || "").trim();
  const cnpj = normalizarCnpj(String(formData.get("cnpj") || ""));

  if (!nome) {
    redirect(`/admin/lojas?erro=${encodeURIComponent("Informe o nome da loja.")}`);
  }

  // O CNPJ era chave única no Postgres. Sem essa checagem, duas lojas com o
  // mesmo CNPJ quebrariam o reconhecimento automático da importação de notas.
  if (cnpj && (await buscarLojaPorCnpj(cnpj))) {
    redirect(
      `/admin/lojas?erro=${encodeURIComponent(
        "Já existe uma loja cadastrada com esse CNPJ."
      )}`
    );
  }

  await criarDocumento(COLECOES.lojas, {
    nome,
    telefone: telefone || null,
    endereco: endereco || null,
    cnpj,
    ativo: true,
    createdAt: new Date(),
  });

  revalidatePath("/admin/lojas");
  redirect(`/admin/lojas?sucesso=${encodeURIComponent(`Loja "${nome}" cadastrada.`)}`);
}

export async function atualizarLojaAction(id: string, formData: FormData) {
  await requireAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const endereco = String(formData.get("endereco") || "").trim();
  const cnpj = normalizarCnpj(String(formData.get("cnpj") || ""));
  const ativo = formData.get("ativo") === "on";

  if (!nome) {
    redirect(`/admin/lojas?erro=${encodeURIComponent("Informe o nome da loja.")}`);
  }

  if (cnpj) {
    const comMesmoCnpj = await buscarLojaPorCnpj(cnpj);
    if (comMesmoCnpj && comMesmoCnpj.id !== id) {
      redirect(
        `/admin/lojas?erro=${encodeURIComponent(
          "Já existe outra loja cadastrada com esse CNPJ."
        )}`
      );
    }
  }

  await atualizarDocumento(COLECOES.lojas, id, {
    nome,
    telefone: telefone || null,
    endereco: endereco || null,
    cnpj,
    ativo,
  });

  revalidatePath("/admin/lojas");
  redirect(`/admin/lojas?sucesso=${encodeURIComponent("Loja atualizada.")}`);
}

export async function excluirLojaAction(id: string) {
  await requireAdmin();

  // Toda montagem aponta para uma loja: apagar a loja deixaria o histórico
  // financeiro sem origem. Era o comportamento padrão da chave estrangeira.
  const montagens = await listarMontagensDaLoja(id);
  if (montagens.length > 0) {
    redirect(
      `/admin/lojas?erro=${encodeURIComponent(
        "Essa loja já tem montagens registradas e não pode ser excluída. Desative-a em vez disso."
      )}`
    );
  }

  await removerDocumento(COLECOES.lojas, id);

  revalidatePath("/admin/lojas");
  redirect(`/admin/lojas?sucesso=${encodeURIComponent("Loja excluída.")}`);
}
