import "server-only";

import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { buscarUsuario } from "@/lib/db";
import { autenticacaoAdmin } from "@/lib/firebase/admin";
import type { Papel } from "@/lib/tipos";

export const COOKIE_NAME = "sessao";

// "||" (não "??"): uma SESSION_SECRET configurada como string vazia deve
// cair no valor padrão igual a uma variável ausente -- com "??" ela passaria
// direto, e assinar um JWT com chave de tamanho zero derruba o login (erro
// "Zero-length key is not supported").
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "chave-de-desenvolvimento-insegura-troque-isso"
);

export type { Papel };

export type SessionPayload = {
  sub: string;
  role: Papel;
  nome: string;
};

export async function hashPassword(senha: string) {
  return bcrypt.hash(senha, 10);
}

export async function verifyPassword(senha: string, hash: string) {
  return bcrypt.compare(senha, hash);
}

// A sessão é um JWT próprio (não o cookie de sessão do Firebase) por dois
// motivos: o proxy.ts consegue conferir o cookie sozinho, sem chamar o
// Firebase a cada navegação, e o login por senha da equipe -- que não passa
// pelo Firebase Auth -- usa exatamente o mesmo caminho do login do admin.
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ role: payload.role, nome: payload.nome })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// cache() memoiza o resultado por requisição: layout, page e componentes
// aninhados podem chamar getSession() livremente sem repetir a leitura do
// cookie e a verificação do JWT a cada chamada.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      role: payload.role as Papel,
      nome: payload.nome as string,
    };
  } catch {
    return null;
  }
});

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/montador");
  return session;
}

export async function requireMontador(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MONTADOR") redirect("/admin");
  return session;
}

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return buscarUsuario(session.sub);
});

export type ContaGoogle = {
  uid: string;
  email: string;
  nome: string | null;
  fotoUrl: string | null;
};

/**
 * Confere um ID token vindo do login com o Google no navegador.
 *
 * Além da assinatura (que o Admin SDK valida), exige duas coisas:
 *
 * - que o login tenha sido *pelo Google* (`sign_in_provider`). Sem isso,
 *   qualquer outro método de login que venha a ser habilitado no projeto do
 *   Firebase -- e-mail/senha, por exemplo -- viraria um caminho alternativo
 *   para entrar como administrador, bastando cadastrar uma conta com o
 *   e-mail dele.
 * - que o e-mail seja verificado, já que é ele (e não o uid) que liga a
 *   conta do Google ao usuário administrador cadastrado no sistema.
 *
 * Devolve `null` em qualquer caso duvidoso -- quem chama trata como login
 * recusado.
 */
export async function verificarContaGoogle(
  idToken: string
): Promise<ContaGoogle | null> {
  if (!idToken) return null;

  try {
    const token = await autenticacaoAdmin().verifyIdToken(idToken, true);
    if (token.firebase?.sign_in_provider !== "google.com") return null;
    if (token.email_verified !== true) return null;
    const email = typeof token.email === "string" ? token.email.toLowerCase() : "";
    if (!email) return null;

    return {
      uid: token.uid,
      email,
      nome: typeof token.name === "string" ? token.name : null,
      fotoUrl: typeof token.picture === "string" ? token.picture : null,
    };
  } catch (error) {
    console.error("Falha ao conferir o login com o Google:", error);
    return null;
  }
}
