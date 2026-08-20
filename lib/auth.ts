import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const COOKIE_NAME = "sessao";

export type Papel = "ADMIN" | "MONTADOR";

export type SessionPayload = {
  sub: string;
  role: Papel;
  nome: string;
};

// No Firebase Auth não fazemos hash manual, mas mantemos as funções para não quebrar dependências imediatamente se houver
export async function hashPassword(senha: string) {
  return senha; // Não usado no Firebase
}

export async function verifyPassword(senha: string, hash: string) {
  return true; // Autenticação feita pelo cliente Firebase
}

export async function createSession(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });
  } catch (error) {
    console.error("Erro ao criar sessão", error);
    throw error;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (sessionCookie) {
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
      await adminAuth.revokeRefreshTokens(decodedClaims.sub);
    } catch (e) {
      // Ignorar erros na revogação
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    // Buscar o papel do usuário no Firestore
    const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();
    if (!userDoc.exists) return null;
    
    const userData = userDoc.data();
    return {
      sub: decodedClaims.uid,
      role: userData?.role as Papel,
      nome: userData?.nome as string,
    };
  } catch (error) {
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
  const userDoc = await adminDb.collection("users").doc(session.sub).get();
  if (!userDoc.exists) return null;
  return { id: userDoc.id, ...userDoc.data() };
});
