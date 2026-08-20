import { requireMontador } from "@/lib/auth";
import { listarLojas, listarMontagensDoMontador, ordenarPor, porId } from "@/lib/db";
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

  const [lojas, montagens] = await Promise.all([
    listarLojas(),
    listarMontagensDoMontador(session.sub),
  ]);

  // Base de tudo nesta tela: montagens concluídas do montador, já filtradas
  // pela loja escolhida (quando houver).
  const concluidas = montagens.filter(
    (m) => m.status === "CONCLUIDO" && (!lojaId || m.lojaId === lojaId)
  );
  const noPeriodo = concluidas.filter(
    (m) => m.concluidoEm && m.concluidoEm >= inicio && m.concluidoEm < fim
  );

  const somar = (lista: typeof concluidas) =>
    lista.reduce((soma, m) => soma + m.valorMontador, 0);

  const pendente = somar(concluidas.filter((m) => !m.pagoAoMontador));
  const recebido = somar(concluidas.filter((m) => m.pagoAoMontador));
  const ganhoNoPeriodo = somar(noPeriodo);
  const periodoCount = noPeriodo.length;

  const lojasPorId = porId(lojas);
  const historico = ordenarPor(noPeriodo, ["concluidoEm", "desc"]).map((m) => ({
    ...m,
    loja: lojasPorId.get(m.lojaId) ?? null,
  }));

  // "Quem te deve": só faz sentido quando a visão não está presa a uma loja.
  const pendentePorLojaBruto = lojaId
    ? []
    : [
        ...montagens
          .filter((m) => m.status === "CONCLUIDO" && !m.pagoAoMontador)
          .reduce((mapa, m) => {
            mapa.set(m.lojaId, (mapa.get(m.lojaId) ?? 0) + m.valorMontador);
            return mapa;
          }, new Map<string, number>()),
      ].map(([lojaIdItem, valor]) => ({ lojaId: lojaIdItem, valor }));

  const nomeLoja = new Map(lojas.map((l) => [l.id, l.nome]));
  const pendentePorLoja = pendentePorLojaBruto
    .map((item) => ({
      lojaId: item.lojaId,
      nome: nomeLoja.get(item.lojaId) ?? "Loja",
      valor: item.valor,
    }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor);

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
          valor={formatarMoeda(pendente)}
          sub="Concluídas, aguardando pagamento"
          cor="text-amber-600"
          icone="⏳"
        />
        <StatCard
          titulo="Já recebido"
          valor={formatarMoeda(recebido)}
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
          valor={formatarMoeda(ganhoNoPeriodo)}
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
                  <p className="text-sm text-slate-500">
                    {m.loja?.nome ?? "Loja removida"}
                  </p>
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
