import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { Badge, Button, Card, Field, Input, PageHeader, Select, StatCard, Vazio } from "@/components/ui";
import { formatarData, formatarMoeda } from "@/lib/format";

function mesAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; lojaId?: string; montadorId?: string }>;
}) {
  const params = await searchParams;
  const mes = params.mes ?? mesAtual();
  const lojaId = params.lojaId ?? "";
  const montadorId = params.montadorId ?? "";

  const [ano, mesNumero] = mes.split("-").map(Number);
  const inicio = new Date(ano, (mesNumero || 1) - 1, 1);
  const fim = new Date(ano, mesNumero || 1, 1);

  const [lojasSnapshot, montadoresSnapshot] = await Promise.all([
    adminDb.collection("lojas").orderBy("nome", "asc").get(),
    adminDb.collection("users").where("role", "==", "MONTADOR").orderBy("nome", "asc").get(),
  ]);

  const lojas = lojasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  const montadores = montadoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  const lojasMap = new Map();
  lojas.forEach(l => lojasMap.set(l.id, l));

  const montadoresMap = new Map();
  montadores.forEach(m => montadoresMap.set(m.id, m));

  let query: FirebaseFirestore.Query = adminDb.collection("montagens")
    .where("criadoEm", ">=", inicio)
    .where("criadoEm", "<", fim);

  if (lojaId) query = query.where("lojaId", "==", lojaId);
  if (montadorId) query = query.where("montadorId", "==", montadorId);

  const montagensSnapshot = await query.get();
  
  let rawMontagens = montagensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  
  // Filter out cancelado and sort in memory
  rawMontagens = rawMontagens.filter(m => m.status !== "CANCELADO");
  
  rawMontagens.sort((a, b) => {
    const timeA = a.criadoEm?.toMillis() || 0;
    const timeB = b.criadoEm?.toMillis() || 0;
    return timeB - timeA;
  });

  const montagens = rawMontagens.map(m => ({
    ...m,
    loja: lojasMap.get(m.lojaId) || { nome: "Loja Excluída" },
    montador: montadoresMap.get(m.montadorId) || null,
    createdAt: m.criadoEm?.toDate() || new Date(0)
  }));

  const totalServico = montagens.reduce((soma, m) => soma + (m.valorServico * 0.08) + (m.valorAssistencia || 0), 0);
  const totalMontador = montagens.reduce((soma, m) => soma + (m.valorMontador || 0), 0);
  const totalEmpresa = totalServico - totalMontador;
  const totalPendenteLoja = montagens
    .filter((m) => !m.pagoPelaLoja)
    .reduce((soma, m) => soma + (m.valorServico * 0.08) + (m.valorAssistencia || 0), 0);
  const totalPendenteMontador = montagens
    .filter((m) => !m.pagoAoMontador)
    .reduce((soma, m) => soma + (m.valorMontador || 0), 0);

  return (
    <div>
      <PageHeader
        titulo="Financeiro"
        descricao="Resumo de valores por período, loja e montador."
      />

      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-4">
          <Field label="Mês">
            <Input type="month" name="mes" defaultValue={mes} />
          </Field>
          <Field label="Loja">
            <Select name="lojaId" defaultValue={lojaId}>
              <option value="">Todas</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Montador">
            <Select name="montadorId" defaultValue={montadorId}>
              <option value="">Todos</option>
              {montadores.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Filtrar
            </Button>
          </div>
        </form>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3">
        <StatCard titulo="Faturamento (serviços)" valor={formatarMoeda(totalServico)} icone="🧾" />
        <StatCard
          titulo="Comissões dos montadores"
          valor={formatarMoeda(totalMontador)}
          cor="text-blue-600"
          icone="👷"
        />
        <StatCard
          titulo="Lucro da empresa"
          valor={formatarMoeda(totalEmpresa)}
          cor="text-emerald-600"
          icone="📈"
        />
        <StatCard
          titulo="A receber das lojas"
          valor={formatarMoeda(totalPendenteLoja)}
          cor="text-amber-600"
          icone="🏬"
        />
        <StatCard
          titulo="A pagar aos montadores"
          valor={formatarMoeda(totalPendenteMontador)}
          cor="text-amber-600"
          icone="⏳"
        />
        <StatCard titulo="Montagens no período" valor={String(montagens.length)} icone="📋" />
      </div>

      {montagens.length === 0 ? (
        <Vazio>Nenhuma montagem encontrada nesse período.</Vazio>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-blue-100/80 bg-white shadow-sm shadow-blue-900/3">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Montador</th>
                <th className="px-4 py-3 text-right">Valor total</th>
                <th className="px-4 py-3 text-right">Comissão</th>
                <th className="px-4 py-3">Loja pagou?</th>
                <th className="px-4 py-3">Montador recebeu?</th>
              </tr>
            </thead>
            <tbody>
              {montagens.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{formatarData(m.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/admin/montagens/${m.id}`} className="hover:underline">
                      {m.clienteNome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.loja.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{m.montador?.nome ?? "-"}</td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {formatarMoeda(m.valorServico)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {formatarMoeda(m.valorMontador)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        m.pagoPelaLoja
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {m.pagoPelaLoja ? "Pago" : "Pendente"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        m.pagoAoMontador
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {m.pagoAoMontador ? "Pago" : "Pendente"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
