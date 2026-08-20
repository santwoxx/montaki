import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
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
  
  const orcamentoDoc = await adminDb.collection("orcamentos").doc(id).get();

  if (!orcamentoDoc.exists) {
    notFound();
  }

  const orcamentoData = orcamentoDoc.data() as any;
  const montagensIds: string[] = orcamentoData.montagensIds || [];
  let montagens: any[] = [];

  if (montagensIds.length > 0) {
    const lojasSnapshot = await adminDb.collection("lojas").get();
    const lojasMap = new Map();
    lojasSnapshot.docs.forEach(doc => lojasMap.set(doc.id, doc.data()));

    // Firestore "in" query is limited to 30 items
    const chunkArray = (arr: string[], size: number) => 
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

    const chunks = chunkArray(montagensIds, 30);
    for (const chunk of chunks) {
      const ms = await adminDb.collection("montagens").where("__name__", "in", chunk).get();
      ms.docs.forEach(doc => {
        const data = doc.data() as any;
        montagens.push({
          id: doc.id,
          ...data,
          dataAgendada: data.dataAgendada?.toDate() || null,
          loja: lojasMap.get(data.lojaId) || { nome: "Loja Excluída" }
        });
      });
    }
  }

  const orcamento = {
    id,
    ...orcamentoData,
    criadoEm: orcamentoData.criadoEm?.toDate() || new Date(0),
    montagens
  };

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
          {orcamento.montagens.map((m: any) => (
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
