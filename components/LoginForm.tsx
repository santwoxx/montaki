"use client";

import { useEffect, useState } from "react";
import type { FirebaseError } from "firebase/app";
import { getRedirectResult, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { autenticacao, provedorGoogle } from "@/lib/firebase/cliente";
import { loginAction, loginComGoogleAction } from "@/lib/actions/auth";
import { Alerta, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

function IconeGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

// Traduz os códigos de erro do Firebase para algo acionável. Em especial
// "unauthorized-domain" e "operation-not-allowed" são erros de configuração
// do projeto no console do Firebase, não erros de quem está tentando entrar
// -- dizer isso poupa muito tempo de suporte (ver README).
function mensagemDoErro(codigo: string | undefined): string {
  switch (codigo) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "Login cancelado.";
    case "auth/unauthorized-domain":
      return "Este endereço ainda não está liberado no Firebase (Authentication → Settings → Authorized domains).";
    case "auth/operation-not-allowed":
      return "O login com Google está desligado no projeto do Firebase (Authentication → Sign-in method).";
    case "auth/network-request-failed":
      return "Sem conexão com o Google agora. Verifique a internet e tente de novo.";
    default:
      return "Não consegui entrar com o Google. Tente de novo.";
  }
}

export function LoginForm({ erro, proximo }: { erro?: string; proximo?: string }) {
  const [entrandoComGoogle, setEntrandoComGoogle] = useState(false);
  const [erroGoogle, setErroGoogle] = useState("");

  async function concluirComToken(idToken: string) {
    // A sessão daqui em diante é o cookie do próprio sistema, então a
    // sessão do Firebase no navegador não serve mais para nada -- encerrar
    // agora evita deixar um login do Google pendurado no dispositivo.
    await signOut(autenticacao()).catch(() => {});
    await loginComGoogleAction(idToken, proximo);
  }

  // Quando o popup não é possível (bloqueado, ou navegador dentro de app),
  // o login acontece por redirecionamento: a página recarrega e o resultado
  // chega aqui.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resultado = await getRedirectResult(autenticacao());
        if (!resultado?.user || cancelado) return;
        setEntrandoComGoogle(true);
        await concluirComToken(await resultado.user.getIdToken());
      } catch (falha) {
        if (cancelado) return;
        setEntrandoComGoogle(false);
        setErroGoogle(mensagemDoErro((falha as FirebaseError)?.code));
      }
    })();
    return () => {
      cancelado = true;
    };
    // Roda uma vez, na montagem: só existe um resultado de redirecionamento
    // por carregamento de página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrarComGoogle() {
    setErroGoogle("");
    setEntrandoComGoogle(true);
    const auth = autenticacao();
    try {
      const resultado = await signInWithPopup(auth, provedorGoogle());
      await concluirComToken(await resultado.user.getIdToken());
    } catch (falha) {
      const codigo = (falha as FirebaseError)?.code;
      if (
        codigo === "auth/popup-blocked" ||
        codigo === "auth/operation-not-supported-in-this-environment"
      ) {
        try {
          await signInWithRedirect(auth, provedorGoogle());
          return; // a página sai daqui; o resultado volta no useEffect acima.
        } catch (erroRedirecionamento) {
          setEntrandoComGoogle(false);
          setErroGoogle(mensagemDoErro((erroRedirecionamento as FirebaseError)?.code));
          return;
        }
      }
      setEntrandoComGoogle(false);
      setErroGoogle(mensagemDoErro(codigo));
    }
  }

  // Erro do próprio navegador (popup fechado, domínio não liberado) tem
  // prioridade sobre o que veio na URL, que é sempre da tentativa anterior.
  const mensagemDeErro = erroGoogle || erro;

  return (
    <div className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xl shadow-navy/5">
      {mensagemDeErro ? <Alerta tipo="erro">{mensagemDeErro}</Alerta> : null}

      <div>
        <p className="mb-3 text-center text-sm font-medium text-slate-500">
          Administrador
        </p>
        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={entrandoComGoogle}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-700 transition-all hover:border-navy hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {entrandoComGoogle ? null : <IconeGoogle />}
          {entrandoComGoogle ? "Entrando…" : "Entrar com Google"}
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          ou
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <p className="mb-3 text-center text-sm font-medium text-slate-500">
        Funcionários e colaboradores
      </p>
      <form action={loginAction} className="space-y-4">
        {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}
        <Field label="E-mail">
          <Input
            type="email"
            name="email"
            placeholder="seu@email.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            name="senha"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>
        <SubmitButton className="w-full text-base py-3" pendingText="Entrando…">
          Entrar
        </SubmitButton>
      </form>
    </div>
  );
}
