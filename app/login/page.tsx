"use client";

import { useState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Alerta, Field, Input } from "@/components/ui";
import { Logo } from "@/components/Logo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { erro?: string; proximo?: string };
}) {
  const erro = searchParams.erro;
  const proximo = searchParams.proximo;
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setLocalError("");
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const senha = formData.get("senha") as string;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const idToken = await userCredential.user.getIdToken();
      await loginAction(idToken, proximo);
    } catch (err: any) {
      console.error(err);
      setLocalError("E-mail ou senha inválidos.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLocalError("");
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const userCredential = await signInWithPopup(auth, provider);
      
      // Verifica se é um dos admins permitidos
      const allowedAdmins = ["pedrobmcity@gmail.com", "brisasofc@gmail.com"];
      if (!userCredential.user.email || !allowedAdmins.includes(userCredential.user.email)) {
        await auth.signOut();
        setLocalError("Apenas administradores autorizados podem fazer login via Google.");
        setLoading(false);
        return;
      }

      const idToken = await userCredential.user.getIdToken();
      await loginAction(idToken, proximo);
    } catch (err: any) {
      console.error(err);
      setLocalError("Erro ao fazer login com Google.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Lado Esquerdo */}
      <div className="hidden w-1/2 flex-col justify-between bg-navy p-12 text-white lg:flex relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-gold via-navy to-navy"></div>
        <div className="relative z-10 flex items-center gap-3">
          <Logo tamanho="md" />
          <div className="leading-tight">
            <p className="text-2xl font-bold uppercase tracking-widest font-display">
              Mont<span className="text-gold">aki</span>
            </p>
          </div>
        </div>
      </div>

      {/* Lado Direito */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xl shadow-navy/5">
            {(erro || localError) ? <Alerta tipo="erro">{localError || erro}</Alerta> : null}

            <div className="mb-6">
              <button 
                type="button" 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 text-base py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Entrar como Admin
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-slate-500">ou como montador</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Field label="E-mail">
                <Input
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  required
                />
              </Field>
              <Field label="Senha">
                <Input
                  type="password"
                  name="senha"
                  placeholder="••••••••"
                  required
                />
              </Field>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full text-base py-3 bg-gold text-navy font-bold rounded-lg hover:brightness-105 transition-all"
              >
                {loading ? "Entrando…" : "Entrar com Senha"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
