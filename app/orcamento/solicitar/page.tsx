import { Metadata } from "next";
import { listarServicos } from "@/lib/db";
import SolicitarOrcamentoClient from "./SolicitarOrcamentoClient";

export const metadata: Metadata = {
  title: "Solicitar Orçamento | Montaki",
  description: "Solicite um orçamento rápido e sem compromisso para montagem de móveis com a Montaki.",
};

export const dynamic = "force-dynamic";

export default async function SolicitarOrcamentoPage() {
  const servicos = await listarServicos();

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <SolicitarOrcamentoClient servicosIniciais={servicos} />
    </div>
  );
}
