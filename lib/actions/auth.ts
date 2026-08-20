"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";

export async function loginAction(idToken: string, proximo?: string) {
  const sufixoProximo = proximo ? `?proximo=${encodeURIComponent(proximo)}` : "";

  if (!idToken) {
    redirect(`/login${sufixoProximo}&erro=Token inválido`);
  }

  try {
    await createSession(idToken);
  } catch (error) {
    console.error("Erro ao iniciar sessão", error);
    redirect(`/login${sufixoProximo}&erro=Falha ao iniciar sessão`);
  }

  redirect(proximo || "/admin"); // Redirecionamento padrão, você pode melhorar para verificar o papel
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
