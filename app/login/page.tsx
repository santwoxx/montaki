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
      <div className="hidden w-1/2 flex-col justify-between bg-navy p-12 text-white lg:flex relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-gold via-navy to-navy"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <Logo tamanho="md" />
          <div className="leading-tight">
            <p className="text-2xl font-bold uppercase tracking-widest font-display">
              Mont<span className="text-gold">aki</span>
            </p>
            <p className="text-sm text-gold font-sans tracking-[0.2em] font-semibold">GESTÃO DE MONTAGENS</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="font-display text-5xl font-bold uppercase leading-[1.1] mb-6">
            Montagem <span className="text-gold">Profissional</span> do início ao acabamento.
          </h1>
          <p className="mb-10 text-lg text-slate-300 font-sans border-l-2 border-gold pl-4">
            Cuidamos de cada detalhe para entregar mais que uma montagem: entregamos qualidade.
          </p>

          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-light text-gold">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div>
                <h3 className="font-bold font-display text-sm">PRECISÃO</h3>
                <p className="text-xs text-slate-400">em cada detalhe</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-light text-gold">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <h3 className="font-bold font-display text-sm">AGILIDADE</h3>
                <p className="text-xs text-slate-400">no processo</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-light text-gold">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
              </div>
              <div>
                <h3 className="font-bold font-display text-sm">COMPROMISSO</h3>
                <p className="text-xs text-slate-400">com você</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-light text-gold">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/><path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/></svg>
              </div>
              <div>
                <h3 className="font-bold font-display text-sm">MÓVEIS</h3>
                <p className="text-xs text-slate-400">residenciais e comerciais</p>
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
