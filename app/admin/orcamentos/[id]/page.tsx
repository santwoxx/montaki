import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import LinkClient from "./LinkClient";
import { formatarMoeda, formatarData } from "@/lib/format";
import { Badge } from "@/components/ui";

export default async function AdminOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      montagens: {
        include: { loja: true },
      },
    },
  });

  if (!orcamento) {
    notFound();
  }

  const STATUS_COLOR: Record<string, string> = {
    PENDENTE: "bg-slate-100 text-slate-700",
    APROVADO: "bg-green-100 text-green-700",
    REJEITADO: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <PageHeader
        titulo="Orçamento Gerado"
        descricao="Compartilhe o link abaixo com o cliente para aprovação."
      />

      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-slate-900 mb-4">Link para o Cliente</h3>
            <LinkClient orcamentoId={id} />
          </Card>
          
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-900">Resumo</h3>
              <Badge className={STATUS_COLOR[orcamento.status] || STATUS_COLOR.PENDENTE}>
                {orcamento.status}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Total:</span>
                <span className="font-medium text-slate-900">{formatarMoeda(orcamento.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Criado em:</span>
                <span className="font-medium text-slate-900">{formatarData(orcamento.criadoEm)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente (referência):</span>
                <span className="font-medium text-slate-900">{orcamento.cliente || "Não informado"}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 mb-2">Montagens Inclusas ({orcamento.montagens.length})</h3>
          {orcamento.montagens.map((m) => (
            <Card key={m.id} className="text-sm">
              <p className="font-medium text-slate-900">{m.clienteNome}</p>
              <p className="text-slate-500">{m.loja.nome}</p>
              <p className="mt-1 text-xs text-slate-400">
                Agendado para: {formatarData(m.dataAgendada)} · Valor: {formatarMoeda(m.valorServico)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
