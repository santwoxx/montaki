// Firebase Admin SDK -- o único caminho por onde os dados do sistema são
// lidos e gravados. Roda sempre no servidor (Server Components, Server
// Actions e Route Handlers), autenticado por uma conta de serviço, o que
// permite fechar completamente o acesso direto do navegador ao Firestore
// (ver firestore.rules).
//
// Sem a marca "server-only" de propósito: os scripts de manutenção em
// `scripts/` rodam fora do Next e precisam deste mesmo caminho. Quem
// protege as páginas é lib/db.ts, que é marcado e é por onde todo o
// sistema acessa os dados.

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const PROJECT_ID_PADRAO =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "centralzapi";

type Credenciais = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function lerCredenciais(): Credenciais {
  // Forma 1: o JSON inteiro da conta de serviço numa variável só. É o que o
  // console do Firebase entrega para download, então é o caminho com menos
  // chance de erro de digitação. Aceita o JSON puro ou em base64 (útil em
  // painéis que não gostam de quebras de linha).
  const bruto = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (bruto) {
    const texto = bruto.trim().startsWith("{")
      ? bruto
      : Buffer.from(bruto, "base64").toString("utf8");
    const json = JSON.parse(texto) as {
      project_id?: string;
      projectId?: string;
      client_email?: string;
      clientEmail?: string;
      private_key?: string;
      privateKey?: string;
    };
    const projectId = json.project_id || json.projectId;
    const clientEmail = json.client_email || json.clientEmail;
    const privateKey = json.private_key || json.privateKey;
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT não tem project_id, client_email e private_key."
      );
    }
    return { projectId, clientEmail, privateKey: normalizarChave(privateKey) };
  }

  // Forma 2: os três campos separados.
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID || PROJECT_ID_PADRAO,
      clientEmail,
      privateKey: normalizarChave(privateKey),
    };
  }

  throw new Error(
    "Firebase não configurado: defina FIREBASE_SERVICE_ACCOUNT (o JSON da conta " +
      "de serviço) ou FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY nas variáveis " +
      "de ambiente. Veja o .env.example."
  );
}

// Painéis de deploy (Vercel incluída) guardam a chave numa linha só, com as
// quebras escritas como "\n" literais. Sem desfazer isso, o SDK recusa a
// chave com "Failed to parse private key".
function normalizarChave(chave: string) {
  const semAspas = chave.trim().replace(/^"|"$/g, "");
  return semAspas.includes("\\n") ? semAspas.replace(/\\n/g, "\n") : semAspas;
}

let appCache: App | undefined;

function appAdmin(): App {
  if (appCache) return appCache;
  const existente = getApps()[0];
  if (existente) {
    appCache = existente;
    return existente;
  }
  const credenciais = lerCredenciais();
  appCache = initializeApp({
    credential: cert(credenciais),
    projectId: credenciais.projectId,
  });
  return appCache;
}

let firestoreCache: Firestore | undefined;

/** Firestore autenticado como conta de serviço. */
export function firestore(): Firestore {
  if (firestoreCache) return firestoreCache;
  const db = getFirestore(appAdmin());
  // Deixa gravar objetos com campos `undefined` (que viram "campo não
  // informado"), em vez de estourar. Boa parte das ações monta o objeto de
  // update com spreads condicionais, e sem isso cada um deles precisaria de
  // tratamento manual. Precisa ser chamado antes da primeira operação.
  db.settings({ ignoreUndefinedProperties: true });
  firestoreCache = db;
  return db;
}

/** Firebase Auth do lado do servidor -- usado só para conferir ID tokens. */
export function autenticacaoAdmin() {
  return getAuth(appAdmin());
}
