import { Metadata } from "next";
import SolicitarOrcamentoClient from "@/app/orcamento/solicitar/SolicitarOrcamentoClient";

export const metadata: Metadata = {
  title: "Solicitar Orçamento | Montaki",
  description: "Solicite um orçamento rápido e sem compromisso para montagem de móveis com a Montaki.",
};

export default function SolicitarOrcamentoPageAlias() {
  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <SolicitarOrcamentoClient />
    </div>
  );
}
