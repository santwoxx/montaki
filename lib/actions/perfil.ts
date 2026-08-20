"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { adminDb } from "@/lib/firebase-admin";
import { requireMontador } from "@/lib/auth";

export async function atualizarPerfilAction(formData: FormData) {
  const session = await requireMontador();

  const erro = (mensagem: string) =>
    redirect(`/montador/perfil?erro=${encodeURIComponent(mensagem)}`);

  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();

  if (!nome) {
    erro("Informe seu nome.");
    return;
  }

  let fotoUrl: string | undefined;
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    if (!foto.type.startsWith("image/")) {
      erro("O arquivo da foto precisa ser uma imagem.");
      return;
    }
    if (foto.size > 5 * 1024 * 1024) {
      erro("A foto é muito grande (máximo 5 MB).");
      return;
    }
    const extensao = foto.type.split("/")[1] || "jpg";
    const blob = await put(`perfis/${session.sub}-${Date.now()}.${extensao}`, foto, {
      access: "public",
      addRandomSuffix: true,
    });
    fotoUrl = blob.url;
  }

  const updateData: any = {
    nome,
    telefone: telefone || null,
  };
  if (fotoUrl) {
    updateData.fotoUrl = fotoUrl;
  }

  await adminDb.collection("users").doc(session.sub).update(updateData);

  revalidatePath("/montador");
  revalidatePath("/montador/perfil");
  revalidatePath("/admin/montadores");
  revalidatePath(`/admin/montadores/${session.sub}`);
  redirect(`/montador/perfil?sucesso=${encodeURIComponent("Perfil atualizado.")}`);
}
