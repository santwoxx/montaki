import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; proximo?: string }>;
}) {
  const { erro, proximo } = await searchParams;

  return (
    <div className="flex min-h-screen">
      {/* Lado Esquerdo - Informações da Empresa (Visível apenas em telas médias+) */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-red-950 via-navy to-slate-950 p-12 text-white lg:flex relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-400 via-red-600 to-transparent"></div>
        <div className="absolute -bottom-10 -left-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <Logo tamanho="md" />
          <div className="leading-tight">
            <p className="text-2xl font-bold uppercase tracking-widest font-display">
              Mont<span className="text-amber-400">a</span><span className="text-red-500">ki</span>
            </p>
            <p className="text-xs text-amber-400 font-sans tracking-[0.2em] font-semibold">GESTÃO DE MONTAGENS</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-600/30 border border-red-500/40 px-3 py-1 text-xs font-bold text-amber-300 mb-4 uppercase tracking-wider">
            <span>⚡ Qualidade • Segurança • Agilidade</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase leading-[1.1] mb-6">
            Montagem <span className="text-amber-400">Profissional</span> de Móveis.
          </h1>
          <p className="mb-8 text-base text-slate-300 font-sans border-l-4 border-amber-400 pl-4">
            Sistema completo para gestão de pedidos, montadores, comissões e orçamentos online.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div>
                <h3 className="font-bold font-display text-xs text-amber-300">PRECISÃO</h3>
                <p className="text-[11px] text-slate-400">em cada montagem</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <h3 className="font-bold font-display text-xs text-red-300">AGILIDADE</h3>
                <p className="text-[11px] text-slate-400">atendimento rápido</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
              </div>
              <div>
                <h3 className="font-bold font-display text-xs text-emerald-300">SEGURANÇA</h3>
                <p className="text-[11px] text-slate-400">garantia total</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/><path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/></svg>
              </div>
              <div>
                <h3 className="font-bold font-display text-xs text-amber-300">MÓVEIS</h3>
                <p className="text-[11px] text-slate-400">todas as marcas</p>
              </div>
            </div>
          </div>
        </div>
        
        <p className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} Montaki. Todos os direitos reservados.
        </p>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <Logo tamanho="lg" className="mx-auto mb-3 shadow-lg" />
            <h1 className="text-2xl font-bold font-display uppercase text-navy">
              Mont<span className="text-gold">aki</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gestão de montagens e comissões
            </p>
          </div>

          <div className="mb-6 text-center hidden lg:block">
            <h2 className="text-2xl font-bold font-display text-navy">Acessar Sistema</h2>
            <p className="text-sm text-slate-500 mt-1">Escolha como você entra</p>
          </div>

          <LoginForm erro={erro} proximo={proximo} />
        </div>
      </div>
    </div>
  );
}
