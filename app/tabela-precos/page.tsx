import Link from "next/link";
import { tabelaPrecos, regrasComerciais } from "@/lib/tabelaPrecos";
import { Card } from "@/components/ui";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tabela de Preços | Montaki",
  description: "Tabela de preços sugeridos para montagem de móveis da Montaki.",
};

export default function TabelaPrecosPage() {
  const principais = tabelaPrecos.filter((item) => item.categoria === "Principal");
  const adicionais = tabelaPrecos.filter((item) => item.categoria === "Adicional");

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
          <div className="pt-2">
            <Link
              href="/orcamento/solicitar"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-bold text-navy shadow-lg hover:bg-gold-light transition-all font-display uppercase tracking-wide text-sm"
            >
              <span>🚀 Fazer Orçamento Online Agora</span>
            </Link>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-0 overflow-hidden border-2 border-gold/50 shadow-lg">
              <div className="bg-navy py-4 px-6 text-center">
                <h2 className="text-xl font-bold text-white tracking-wide uppercase">Serviços</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {principais.map((item) => (
                  <li key={item.id} className="flex justify-between items-center py-3 px-6 hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-800">{item.nome}</span>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-navy bg-gold/20 px-3 py-1 rounded-md">
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
              <div className="bg-slate-800 py-3 px-4 text-center">
                <h2 className="text-lg font-bold text-white uppercase">Serviços Adicionais</h2>
              </div>
              <ul className="divide-y divide-slate-100 text-sm">
                {adicionais.map((item) => (
                  <li key={item.id} className="flex flex-col py-3 px-4">
                    <span className="font-medium text-slate-800 mb-1">{item.nome}</span>
                    <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                      {item.precoFormatado}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <h2 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> Regras Comerciais
              </h2>
              <ul className="space-y-3 text-sm text-red-900/80">
                {regrasComerciais.map((regra, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✔</span>
                    <span>{regra}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
