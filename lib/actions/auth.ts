"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const proximo = String(formData.get("proximo") || "");
  const sufixoProximo = proximo ? `&proximo=${encodeURIComponent(proximo)}` : "";

  if (!email || !senha) {
    redirect(
      `/login?erro=${encodeURIComponent("Informe e-mail e senha.")}${sufixoProximo}`
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.ativo || !user.senha || !(await verifyPassword(senha, user.senha))) {
    redirect(
      `/login?erro=${encodeURIComponent("E-mail ou senha inválidos.")}${sufixoProximo}`
    );
  }

  await createSession({ sub: user.id, role: user.role, nome: user.nome });

  const destino = proximo || (user.role === "ADMIN" ? "/admin" : "/montador");
  redirect(destino);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
