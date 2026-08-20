"use server";

import { revalidatePath } from "next/cache";
import { COLECOES, removerDocumento } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Descarta uma nota pendente sem transformá-la em montagem (ex: veio
// duplicada, ou o pedido foi cancelado no sistema externo).
export async function descartarNotaPendenteAction(id: string) {
  await requireAdmin();
  await removerDocumento(COLECOES.notasPendentes, id).catch(() => {});
  revalidatePath("/admin/montagens/nova");
  revalidatePath("/admin");
}
