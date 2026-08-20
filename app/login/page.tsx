"use client";

import { useState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
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

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
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
      setLocalError("E-mail ou senha inválidos no Firebase.");
      setLoading(false);
    }
  };

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

            <form onSubmit={handleLogin} className="space-y-4">
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
                className="w-full text-base py-3 bg-gold text-navy font-bold rounded-lg"
              >
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
