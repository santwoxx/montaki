"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
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

  try {
    // Check for duplicate CNPJ
    const lojasRef = adminDb.collection("lojas");
    const snapshot = await lojasRef.where("cnpj", "==", cnpj).get();
    
    if (!snapshot.empty) {
      redirect(
        `/admin/lojas?erro=${encodeURIComponent("Já existe uma loja cadastrada com esse CNPJ.")}`
      );
    }

    await lojasRef.add({
      nome,
      telefone: telefone || null,
      endereco: endereco || null,
      cnpj,
      ativo: true,
      createdAt: new Date(),
    });

  } catch (error: any) {
    console.error("Erro ao criar loja:", error);
    // Only throw if it's not a redirect
    if (error.message !== 'NEXT_REDIRECT') {
      throw error;
    }
    throw error; // Re-throw redirect to be caught by Next.js
  }

  revalidatePath("/admin/lojas");
  redirect(
    `/admin/lojas?sucesso=${encodeURIComponent(`Loja "${nome}" cadastrada.`)}`
  );
}

export async function atualizarLojaAction(id: string, formData: FormData) {
  await requireAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const endereco = String(formData.get("endereco") || "").trim();
  const cnpj = normalizarCnpj(String(formData.get("cnpj") || ""));
  const ativo = formData.get("ativo") === "on";

  if (!nome) {
    redirect(
      `/admin/lojas?erro=${encodeURIComponent("Informe o nome da loja.")}`
    );
  }

  try {
    const lojasRef = adminDb.collection("lojas");
    const snapshot = await lojasRef.where("cnpj", "==", cnpj).get();
    
    // Check if duplicate CNPJ belongs to ANOTHER store
    const isDuplicate = snapshot.docs.some(doc => doc.id !== id);
    if (isDuplicate) {
      redirect(
        `/admin/lojas?erro=${encodeURIComponent("Já existe outra loja cadastrada com esse CNPJ.")}`
      );
    }

    await lojasRef.doc(id).update({
      nome,
      telefone: telefone || null,
      endereco: endereco || null,
      cnpj,
      ativo,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Erro ao atualizar loja:", error);
    if (error.message !== 'NEXT_REDIRECT') {
      throw error;
    }
    throw error;
  }

  revalidatePath("/admin/lojas");
  redirect(`/admin/lojas?sucesso=${encodeURIComponent("Loja atualizada.")}`);
}

export async function excluirLojaAction(id: string) {
  await requireAdmin();

  try {
    // In Firestore, there are no strict foreign key constraints like P2003,
    // so we manually check if there are montagens for this store
    const montagensSnapshot = await adminDb
      .collection("montagens")
      .where("lojaId", "==", id)
      .limit(1)
      .get();

    if (!montagensSnapshot.empty) {
      redirect(
        `/admin/lojas?erro=${encodeURIComponent(
          "Essa loja já tem montagens registradas e não pode ser excluída. Desative-a em vez disso."
        )}`
      );
    }

    await adminDb.collection("lojas").doc(id).delete();
  } catch (error: any) {
    console.error("Erro ao excluir loja:", error);
    if (error.message !== 'NEXT_REDIRECT') {
      throw error;
    }
    throw error;
  }

  revalidatePath("/admin/lojas");
  redirect(`/admin/lojas?sucesso=${encodeURIComponent("Loja excluída.")}`);
}
