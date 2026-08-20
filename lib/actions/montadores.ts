"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth";
import { paraNumeroBr } from "@/lib/format";

export async function criarMontadorAction(formData: FormData) {
  await requireAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") || "").trim();
  const senha = String(formData.get("senha") || "");
  let comissao = paraNumeroBr(formData.get("comissao")?.toString() || "0");
  
  if (!Number.isFinite(comissao) || comissao < 0) comissao = 0;
  if (comissao > 100) comissao = 100;

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

  try {
    // 1. Criar o usuário no Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password: senha,
      displayName: nome,
    });

    // 2. Salvar os metadados do usuário no Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      nome,
      email,
      telefone: telefone || null,
      role: "MONTADOR",
      comissaoPadrao: comissao,
      ativo: true,
      createdAt: new Date(),
    });

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      redirect(
        `/admin/montadores?erro=${encodeURIComponent(
          "Já existe um usuário cadastrado com este e-mail no Firebase."
        )}`
      );
    }
    console.error("Erro ao criar montador:", error);
    redirect(
      `/admin/montadores?erro=${encodeURIComponent("Erro ao criar usuário no sistema.")}`
    );
  }

  revalidatePath("/admin/montadores");
  redirect(
    `/admin/montadores?sucesso=${encodeURIComponent(
      `Montador "${nome}" cadastrado com sucesso.`
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
  
  let comissaoPadrao = paraNumeroBr(formData.get("comissaoPadrao")?.toString() || "0");
  if (!Number.isFinite(comissaoPadrao) || comissaoPadrao < 0) comissaoPadrao = 0;
  if (comissaoPadrao > 100) comissaoPadrao = 100;

  if (!nome || !email) {
    redirect(
      `/admin/montadores/${id}?erro=${encodeURIComponent(
        "Preencha nome e e-mail."
      )}`
    );
  }

  if (novaSenha && novaSenha.length < 6) {
    redirect(
      `/admin/montadores/${id}?erro=${encodeURIComponent(
        "A nova senha deve ter pelo menos 6 caracteres."
      )}`
    );
  }

  try {
    // Atualiza auth se o email ou senha mudarem, e gerencia status ativo
    const updateData: any = {
      email,
      displayName: nome,
      disabled: !ativo
    };
    if (novaSenha) {
      updateData.password = novaSenha;
    }
    await adminAuth.updateUser(id, updateData);

    // Atualiza metadados no Firestore
    await adminDb.collection("users").doc(id).update({
      nome,
      email,
      telefone: telefone || null,
      ativo,
      comissaoPadrao,
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      redirect(
        `/admin/montadores/${id}?erro=${encodeURIComponent(
          "Este e-mail já está em uso por outro usuário."
        )}`
      );
    }
    console.error(error);
    redirect(`/admin/montadores/${id}?erro=${encodeURIComponent("Erro interno ao atualizar.")}`);
  }

  revalidatePath("/admin/montadores");
  revalidatePath(`/admin/montadores/${id}`);
  redirect(
    `/admin/montadores/${id}?sucesso=${encodeURIComponent("Dados atualizados.")}`
  );
}

export async function salvarComissoesAction(montadorId: string, formData: FormData) {
  await requireAdmin();

  const lojasSnapshot = await adminDb.collection("lojas").get();

  const batch = adminDb.batch();

  lojasSnapshot.docs.forEach((lojaDoc) => {
    const bruto = String(formData.get(`percentual_${lojaDoc.id}`) || "0").replace(",", ".");
    let percentual = Number(bruto);
    if (!Number.isFinite(percentual) || percentual < 0) percentual = 0;
    if (percentual > 100) percentual = 100;

    const comissaoRef = adminDb.collection("comissoesLoja").doc(`${montadorId}_${lojaDoc.id}`);
    batch.set(comissaoRef, {
      montadorId,
      lojaId: lojaDoc.id,
      percentual
    });
  });

  await batch.commit();

  revalidatePath(`/admin/montadores/${montadorId}`);
  redirect(
    `/admin/montadores/${montadorId}?sucesso=${encodeURIComponent(
      "Comissões atualizadas."
    )}`
  );
}

export async function excluirMontadorAction(id: string) {
  await requireAdmin();

  try {
    // Excluir do Firestore
    await adminDb.collection("users").doc(id).delete();
    // Excluir do Firebase Auth
    await adminAuth.deleteUser(id);
  } catch (error) {
    console.error(error);
    redirect(
      `/admin/montadores?erro=${encodeURIComponent(
        "Erro ao excluir montador."
      )}`
    );
  }

  revalidatePath("/admin/montadores");
  revalidatePath("/admin/montagens");
  redirect(
    `/admin/montadores?sucesso=${encodeURIComponent("Montador excluído.")}`
  );
}
