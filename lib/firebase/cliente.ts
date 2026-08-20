"use client";

// Firebase do lado do navegador. É usado para uma coisa só: autenticar o
// administrador com a conta Google dele e devolver um ID token que o
// servidor confere (ver lib/actions/auth.ts). Nenhum dado do sistema é lido
// ou escrito por aqui -- isso é sempre feito no servidor, com o Admin SDK
// (lib/firebase/admin.ts), para que as regras do Firestore possam bloquear
// 100% do acesso vindo do navegador (ver firestore.rules).
//
// Estes valores são a configuração pública do app web (a mesma que o
// console do Firebase mostra em "Configuração do SDK"). Não são segredo:
// eles identificam o projeto, não autorizam nada sozinhos. Ficam como
// padrão no código para o sistema funcionar sem configuração extra, mas
// podem ser sobrescritos por variáveis NEXT_PUBLIC_FIREBASE_* se um dia o
// projeto do Firebase mudar.

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDK-MXg8s6EBQuH4Il7miNLN1bQkiXUXeU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "centralzapi.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "centralzapi",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "centralzapi.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1053898999297",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:1053898999297:web:cb2914f5ac346976da2200",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-LN98L8WLQ9",
};

export function appFirebase(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function autenticacao(): Auth {
  const auth = getAuth(appFirebase());
  // Mostra a tela de login do Google no idioma do navegador em vez de
  // sempre em inglês.
  auth.useDeviceLanguage();
  return auth;
}

export function provedorGoogle() {
  const provider = new GoogleAuthProvider();
  // Sem isso, quem já está logado numa conta Google no navegador entra
  // direto com ela -- ruim justamente aqui, onde só uma conta específica
  // (a do administrador) é aceita.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * Liga o Google Analytics do Firebase. Só funciona no navegador e em
 * ambientes suportados (`isSupported()` evita quebrar em navegadores sem
 * suporte a IndexedDB, como alguns modos anônimos). Falhar aqui nunca pode
 * derrubar a página, então todo erro é engolido de propósito.
 */
export async function iniciarAnalytics() {
  if (typeof window === "undefined") return;
  if (!firebaseConfig.measurementId) return;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (!(await isSupported())) return;
    getAnalytics(appFirebase());
  } catch {
    // Analytics é acessório -- bloqueadores de rastreamento derrubam esse
    // import com frequência e isso não pode afetar o resto do sistema.
  }
}
