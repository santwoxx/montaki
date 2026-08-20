// Cria (ou conserta) o cadastro dos administradores no Firestore.
//
//   npm run admin:criar                       -> cria/promove os administradores padrão (pedrobmcity@gmail.com e brisasofc@gmail.com)
//   npm run admin:criar -- outro@gmail.com    -> usa outro e-mail
//   npm run admin:criar -- outro@gmail.com --senha=umaSenhaForte
//
// Na maior parte das vezes este script não é necessário: na primeira vez
// que um admin autorizado entra com o Google, o próprio sistema cria o cadastro dele
// (ver lib/actions/auth.ts). Ele existe para dois casos:
//
//   - preparar o acesso antes do primeiro login;
//   - destravar o acesso se o login com o Google estiver indisponível --
//     aí `--senha` cadastra também uma senha de emergência, e o admin passa
//     a poder entrar pelo formulário de e-mail e senha. Sem `--senha`, o
//     administrador entra pelo Google.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { COLECOES } from "../lib/colecoes";
import { EMAILS_ADMIN_PADRAO } from "../lib/config";
import { firestore } from "../lib/firebase/admin";

async function processarAdmin(email: string, senhaBruta?: string) {
  const emailNormalizado = email.trim().toLowerCase();
  const db = firestore();
  const existentes = await db
    .collection(COLECOES.usuarios)
    .where("email", "==", emailNormalizado)
    .get();

  const senha = senhaBruta ? await bcrypt.hash(senhaBruta, 10) : null;

  if (!existentes.empty) {
    const doc = existentes.docs[0];
    await doc.ref.update({
      role: "ADMIN",
      ativo: true,
      ...(senhaBruta ? { senha } : {}),
    });
    console.log(`✓ Usuário ${emailNormalizado} já existia -- promovido a administrador ativo.`);
    if (senhaBruta) console.log("  Senha de emergência atualizada.");
    return;
  }

  await db.collection(COLECOES.usuarios).add({
    nome: emailNormalizado === "pedrobmcity@gmail.com" ? "Pedro" : "Administrador",
    email: emailNormalizado,
    telefone: null,
    fotoUrl: null,
    senha,
    role: "ADMIN",
    vinculo: null,
    ativo: true,
    comissaoPadrao: 0,
    googleUid: null,
    createdAt: new Date(),
  });

  console.log(`✓ Administrador ${emailNormalizado} criado.`);
}

async function main() {
  const argumentos = process.argv.slice(2);
  const emailEspecifico = argumentos.find((a) => !a.startsWith("--"));
  const senhaBruta = argumentos
    .find((a) => a.startsWith("--senha="))
    ?.slice("--senha=".length);

  if (senhaBruta !== undefined && senhaBruta.length < 6) {
    throw new Error("A senha de emergência precisa ter pelo menos 6 caracteres.");
  }

  if (emailEspecifico) {
    await processarAdmin(emailEspecifico, senhaBruta);
  } else {
    console.log("Processando administradores padrão do sistema:");
    for (const email of EMAILS_ADMIN_PADRAO) {
      await processarAdmin(email, senhaBruta);
    }
  }

  console.log("\nPronto! Os administradores podem entrar com o botão “Entrar com Google”.");
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
