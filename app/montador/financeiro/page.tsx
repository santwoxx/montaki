import { requireMontador } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { Badge, Card, Field, Input, PageHeader, Select, StatCard, Vazio } from "@/components/ui";
import { formatarData, formatarMoeda } from "@/lib/format";

function mesAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinanceiroMontadorPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; lojaId?: string }>;
}) {
  const session = await requireMontador();
  const { mes: mesParam, lojaId } = await searchParams;
  const mes = mesParam ?? mesAtual();
  const [ano, mesNumero] = mes.split("-").map(Number);
  const inicio = new Date(ano, (mesNumero || 1) - 1, 1);
  const fim = new Date(ano, mesNumero || 1, 1);

  const [lojasSnapshot, montagensSnapshot] = await Promise.all([
    adminDb.collection("lojas").orderBy("nome", "asc").get(),
    adminDb.collection("montagens").where("montadorId", "==", session.sub).where("status", "==", "CONCLUIDO").get(),
  ]);

  const lojasMap = new Map();
  const lojas = lojasSnapshot.docs.map(doc => {
    const data = { id: doc.id, ...doc.data() as any };
    lojasMap.set(doc.id, data);
    return data;
  });
  
  const nomeLoja = new Map(lojas.map((l) => [l.id, l.nome]));

  const rawMontagens = montagensSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as any,
    concluidoEm: doc.data().concluidoEm?.toDate() || new Date(0)
  }));

  // Apply optional lojaId filter
  let filteredMontagens = rawMontagens;
  if (lojaId) {
    filteredMontagens = filteredMontagens.filter(m => m.lojaId === lojaId);
  }

  const pendenteAgg = filteredMontagens
    .filter(m => !m.pagoAoMontador)
    .reduce((soma, m) => soma + (m.valorMontador || 0), 0);

  const recebidoAgg = filteredMontagens
    .filter(m => m.pagoAoMontador)
    .reduce((soma, m) => soma + (m.valorMontador || 0), 0);

  const montagensPeriodo = filteredMontagens.filter(m => m.concluidoEm >= inicio && m.concluidoEm < fim);

  const periodoAgg = montagensPeriodo.reduce((soma, m) => soma + (m.valorMontador || 0), 0);
  const periodoCount = montagensPeriodo.length;

  const pendentePorLojaMap = new Map<string, number>();
  if (!lojaId) {
    filteredMontagens.filter(m => !m.pagoAoMontador).forEach(m => {
      const current = pendentePorLojaMap.get(m.lojaId) || 0;
      pendentePorLojaMap.set(m.lojaId, current + (m.valorMontador || 0));
    });
  }

  const pendentePorLoja = Array.from(pendentePorLojaMap.entries())
    .map(([idLoja, valor]) => ({
      lojaId: idLoja,
      nome: nomeLoja.get(idLoja) ?? "Loja Excluída",
      valor,
    }))
    .filter(item => item.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const historico = montagensPeriodo
    .sort((a, b) => b.concluidoEm.getTime() - a.concluidoEm.getTime())
    .map(m => ({
      ...m,
      loja: lojasMap.get(m.lojaId) || { nome: "Loja Excluída" }
    }));

  return (
    <div>
      <PageHeader titulo="Financeiro" descricao="Seus ganhos com as montagens concluídas." />

      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-3">
          <Field label="Mês">
            <Input type="month" name="mes" defaultValue={mes} />
          </Field>
          <Field label="Loja">
            <Select name="lojaId" defaultValue={lojaId ?? ""}>
              <option value="">Todas</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-navy px-4 py-3 text-sm font-medium text-white hover:bg-navy-light"
            >
              Filtrar
            </button>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Situação atual{lojaId ? ` · ${nomeLoja.get(lojaId) ?? ""}` : ""}
      </h2>
      <div className="mb-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        <StatCard
          titulo="Pendente de receber"
          valor={formatarMoeda(pendenteAgg)}
          sub="Concluídas, aguardando pagamento"
          cor="text-amber-600"
          icone="⏳"
        />
        <StatCard
          titulo="Já recebido"
          valor={formatarMoeda(recebidoAgg)}
          sub="Total pago até hoje"
          cor="text-emerald-600"
          icone="✅"
        />
      </div>

      {pendentePorLoja.length > 0 ? (
        <Card className="mb-8">
          <p className="mb-3 text-sm font-medium text-slate-500">Quem te deve</p>
          <div className="space-y-2">
            {pendentePorLoja.map((item) => (
              <div key={item.lojaId} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{item.nome}</span>
                <span className="font-semibold text-amber-600">{formatarMoeda(item.valor)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        No mês selecionado
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        <StatCard
          titulo="Ganho no período"
          valor={formatarMoeda(periodoAgg)}
          icone="📈"
        />
        <StatCard titulo="Montagens concluídas" valor={String(periodoCount)} icone="📋" />
      </div>

      <h2 className="mb-3 text-base font-semibold text-slate-900">
        Histórico do período
      </h2>

      {historico.length === 0 ? (
        <Vazio>Nenhuma montagem concluída nesse período.</Vazio>
      ) : (
        <div className="space-y-3">
          {historico.map((m) => (
            <Card key={m.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{m.clienteNome}</p>
                  <p className="text-sm text-slate-500">{m.loja.nome}</p>
                  <p className="text-xs text-slate-400">
                    Concluída em {formatarData(m.concluidoEm)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {formatarMoeda(m.valorMontador)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {m.percentualMontador}% de {formatarMoeda(m.valorServico)}
                  </p>
                  <Badge
                    className={
                      m.pagoAoMontador
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {m.pagoAoMontador ? "Pago" : "Pendente"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
