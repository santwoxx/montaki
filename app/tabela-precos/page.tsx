import Link from "next/link";
import { listarServicos } from "@/lib/db";
import { regrasComerciais } from "@/lib/tabelaPrecos";
import { Card } from "@/components/ui";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tabela de Preços | Montaki",
  description: "Tabela oficial de preços sugeridos para montagem de móveis da Montaki.",
};

export const dynamic = "force-dynamic";

export default async function TabelaPrecosPage() {
  const servicos = await listarServicos();
  const principais = servicos.filter((item) => item.categoria === "Principal");
  const adicionais = servicos.filter((item) => item.categoria === "Adicional");

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-gold bg-navy px-3 py-1 rounded-full">
            Montaki Serviços
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-display">
            Tabela de Preços de Montagem
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Valores oficiais de referência para montagem e serviços adicionais.
          </p>
          <div className="pt-2 flex flex-wrap gap-3 justify-center">
            <Link
              href="/orcamento/solicitar"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-bold text-navy shadow-lg hover:bg-gold-light transition-all font-display uppercase tracking-wide text-sm"
            >
              <span>🚀 Fazer Orçamento Online</span>
            </Link>
            <a
              href="https://wa.me/5524993210547?text=Ol%C3%A1%2C%20vi%20a%20tabela%20de%20pre%C3%A7os%20e%20gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20montagem."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] px-5 py-3 font-bold text-white shadow-lg transition-all font-display uppercase tracking-wide text-sm"
            >
              <span>💬 Falar com Atendente</span>
            </a>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-0 overflow-hidden border-2 border-amber-400/60 shadow-lg">
              <div className="bg-gradient-to-r from-red-800 to-red-950 py-4 px-6 text-center border-b border-red-700">
                <h2 className="text-xl font-bold text-amber-300 tracking-wide uppercase font-display">
                  Serviços de Montagem
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {principais.map((item) => (
                  <li key={item.id} className="flex justify-between items-center py-3 px-6 hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-800">{item.nome}</span>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-slate-950 bg-amber-400 px-3 py-1 rounded-md text-sm shadow-xs">
                        {item.precoFormatado}
                      </span>
                      {item.observacao && (
                        <span className="text-xs text-slate-400 mt-1">{item.observacao}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-0 overflow-hidden border-2 border-slate-200 shadow-md">
              <div className="bg-slate-900 py-3.5 px-4 text-center border-b border-slate-800">
                <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wide font-display">
                  Serviços Adicionais
                </h2>
              </div>
              <ul className="divide-y divide-slate-100 text-sm">
                {adicionais.map((item) => (
                  <li key={item.id} className="flex flex-col py-3 px-4">
                    <span className="font-medium text-slate-800 mb-1">{item.nome}</span>
                    <span className="font-bold text-slate-900 bg-amber-100 px-2.5 py-0.5 rounded w-fit text-xs border border-amber-200">
                      {item.precoFormatado}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="bg-red-50/60 border-2 border-red-200 shadow-xs">
              <h2 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                <span className="text-lg">📋</span> Regras Comerciais
              </h2>
              <ul className="space-y-2.5 text-xs text-red-950/80">
                {regrasComerciais.map((regra, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-600 font-bold mt-0.5">✔</span>
                    <span>{regra}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Banner de Compromisso Montaki */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 p-4 text-slate-950 font-black text-center shadow-lg border border-amber-300 font-display tracking-widest text-sm sm:text-base flex items-center justify-center gap-3">
          <span>🔧</span>
          <span>QUALIDADE</span>
          <span className="text-red-600">•</span>
          <span>SEGURANÇA</span>
          <span className="text-red-600">•</span>
          <span>AGILIDADE</span>
          <span>🔧</span>
        </div>
      </div>
    </div>
  );
}
