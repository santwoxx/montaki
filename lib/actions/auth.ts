"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ehEmailAdminAutorizado } from "@/lib/config";
import {
  COLECOES,
  atualizarDocumento,
  buscarUsuarioPorEmail,
  criarDocumento,
} from "@/lib/db";
import {
  createSession,
  destroySession,
  verificarContaGoogle,
  verifyPassword,
} from "@/lib/auth";
import type { Usuario } from "@/lib/tipos";

function paraLogin(mensagem: string, proximo?: string): never {
  const parametros = new URLSearchParams({ erro: mensagem });
  if (proximo) parametros.set("proximo", proximo);
  redirect(`/login?${parametros.toString()}`);
}

// Só aceita caminho interno: sem isso, "?proximo=https://site-falso" faria
// o sistema jogar quem acabou de entrar para fora do domínio.
function destinoSeguro(proximo: string | undefined, papel: Usuario["role"]) {
  const padrao = papel === "ADMIN" ? "/admin" : "/montador";
  if (!proximo) return padrao;
  if (!proximo.startsWith("/") || proximo.startsWith("//")) return padrao;
  return proximo;
}

/**
 * Login da equipe (funcionários e colaboradores): e-mail e senha
 * cadastrados pelo administrador no painel. Não passa pelo Firebase Auth --
 * a senha é conferida aqui contra o hash bcrypt guardado no Firestore.
 */
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const proximoBruto = String(formData.get("proximo") || "");
  const proximo = proximoBruto || undefined;

  if (!email || !senha) {
    paraLogin("Informe e-mail e senha.", proximo);
  }

  let usuario: Usuario | null = null;
  try {
    usuario = await buscarUsuarioPorEmail(email);
  } catch (error) {
    console.error("Erro ao consultar o banco no login:", error);
    paraLogin("Erro de conexão com o banco de dados.", proximo);
  }

  // Quem entra com o Google não tem senha aqui. Uma mensagem específica
  // evita a situação de o administrador ficar tentando uma senha que nunca
  // existiu.
  if (usuario && usuario.ativo && !usuario.senha && usuario.role === "ADMIN") {
    paraLogin("Esta conta entra pelo botão “Entrar com Google”.", proximo);
  }

  if (
    !usuario ||
    !usuario.ativo ||
    !usuario.senha ||
    !(await verifyPassword(senha, usuario.senha))
  ) {
    paraLogin("E-mail ou senha inválidos.", proximo);
  }

  await createSession({ sub: usuario.id, role: usuario.role, nome: usuario.nome });
  redirect(destinoSeguro(proximo, usuario.role));
}

/**
 * Login do administrador com a conta Google (Firebase Auth).
 *
 * O navegador faz o login no Firebase e manda o ID token para cá: quem
 * decide se a pessoa entra é sempre o servidor, conferindo o token e o
 * cadastro. Nenhuma checagem feita no navegador vale como autorização --
 * ela pode ser burlada por qualquer um com o console aberto.
 */
export async function loginComGoogleAction(idToken: string, proximoBruto?: string) {
  const proximo = proximoBruto || undefined;

  const conta = await verificarContaGoogle(idToken);
  if (!conta) {
    paraLogin("Não consegui confirmar esse login do Google. Tente de novo.", proximo);
  }

  const usuario = await buscarUsuarioPorEmail(conta.email);

  // Primeiro acesso: ainda não existe cadastro para o dono do sistema.
  if (!usuario) {
    if (!ehEmailAdminAutorizado(conta.email)) {
      paraLogin(
        "Esta conta Google não tem acesso ao sistema. Funcionários e colaboradores entram com e-mail e senha.",
        proximo
      );
    }

    const id = await criarDocumento(COLECOES.usuarios, {
      nome: conta.nome || "Administrador",
      email: conta.email,
      telefone: null,
      fotoUrl: conta.fotoUrl,
      senha: null,
      role: "ADMIN",
      vinculo: null,
      ativo: true,
      comissaoPadrao: 0,
      googleUid: conta.uid,
      createdAt: new Date(),
    });

    await createSession({
      sub: id,
      role: "ADMIN",
      nome: conta.nome || "Administrador",
    });
    redirect(destinoSeguro(proximo, "ADMIN"));
  }

  if (usuario.role !== "ADMIN") {
    paraLogin(
      "O login com o Google é só do administrador. Entre com seu e-mail e senha.",
      proximo
    );
  }
  if (!usuario.ativo) {
    paraLogin("Este acesso está desativado. Fale com o administrador.", proximo);
  }

  // Guarda o vínculo com a conta Google (e a foto, se ainda não houver uma)
  // para o painel mostrar quem está logado. Não impede o login se falhar.
  const novosDados: Record<string, unknown> = {};
  if (usuario.googleUid !== conta.uid) novosDados.googleUid = conta.uid;
  if (!usuario.fotoUrl && conta.fotoUrl) novosDados.fotoUrl = conta.fotoUrl;
  if (Object.keys(novosDados).length > 0) {
    try {
      await atualizarDocumento(COLECOES.usuarios, usuario.id, novosDados);
    } catch (error) {
      console.error("Não consegui atualizar os dados do administrador:", error);
    }
  }

  await createSession({ sub: usuario.id, role: "ADMIN", nome: usuario.nome });
  revalidatePath("/admin");
  redirect(destinoSeguro(proximo, "ADMIN"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
