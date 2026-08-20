import Link from "next/link";
import { requireMontador } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { Badge, Card, PageHeader, StatCard, Vazio } from "@/components/ui";
import { Estrelas } from "@/components/Estrelas";
import { formatarData, formatarMoeda, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";

export default async function PainelMontadorPage() {
  const session = await requireMontador();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    montagensSnapshot,
    avaliacoesSnapshot,
    lojasSnapshot
  ] = await Promise.all([
    adminDb.collection("montagens").where("montadorId", "==", session.sub).get(),
    adminDb.collection("avaliacoes").where("montadorId", "==", session.sub).get(),
    adminDb.collection("lojas").get(),
  ]);

  const lojasMap = new Map();
  lojasSnapshot.docs.forEach(doc => lojasMap.set(doc.id, doc.data()));

  const rawMontagens = montagensSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as any,
    criadoEm: doc.data().criadoEm?.toDate() || new Date(0),
    dataAgendada: doc.data().dataAgendada?.toDate() || null,
    concluidoEm: doc.data().concluidoEm?.toDate() || null,
  }));

  let ativas = rawMontagens
    .filter(m => m.status === "PENDENTE" || m.status === "EM_ANDAMENTO")
    .map(m => ({ ...m, loja: lojasMap.get(m.lojaId) || { nome: "Loja Excluída" } }));

  ativas.sort((a, b) => {
    if (a.dataAgendada && !b.dataAgendada) return -1;
    if (!a.dataAgendada && b.dataAgendada) return 1;
    if (a.dataAgendada && b.dataAgendada) {
      if (a.dataAgendada.getTime() !== b.dataAgendada.getTime()) {
        return a.dataAgendada.getTime() - b.dataAgendada.getTime();
      }
    }
    return a.criadoEm.getTime() - b.criadoEm.getTime();
  });

  let concluidasRecentes = rawMontagens
    .filter(m => m.status === "CONCLUIDO")
    .map(m => ({ ...m, loja: lojasMap.get(m.lojaId) || { nome: "Loja Excluída" } }));

  concluidasRecentes.sort((a, b) => (b.concluidoEm?.getTime() || 0) - (a.concluidoEm?.getTime() || 0));
  concluidasRecentes = concluidasRecentes.slice(0, 5);

  const valorPendenteAgg = rawMontagens
    .filter(m => m.status === "PENDENTE" || m.status === "EM_ANDAMENTO")
    .reduce((soma, m) => soma + (m.valorMontador || 0), 0);

  const aReceberAgg = rawMontagens
    .filter(m => m.status !== "CANCELADO" && m.criadoEm >= inicioMes)
    .reduce((soma, m) => soma + (m.valorMontador || 0), 0);

  const faturamentoMesAgg = rawMontagens
    .filter(m => m.status !== "CANCELADO" && m.criadoEm >= inicioMes)
    .reduce((soma, m) => soma + (m.valorServico || 0), 0);

  const rawAvaliacoes = avaliacoesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as any,
    criadoEm: doc.data().criadoEm?.toDate() || new Date(0)
  }));

  const totalAvaliacoes = rawAvaliacoes.length;
  const mediaAvaliacao = totalAvaliacoes > 0
    ? rawAvaliacoes.reduce((soma, a) => soma + (a.estrelas || 0), 0) / totalAvaliacoes
    : 0;

  rawAvaliacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

  const avaliacoesRecentes = rawAvaliacoes.slice(0, 3).map(a => {
    const m = rawMontagens.find(mont => mont.id === a.montagemId);
    return {
      ...a,
      montagem: { clienteNome: m ? m.clienteNome : "Desconhecido" }
    };
  });

  return (
    <div>
      <PageHeader titulo={`Olá, ${session.nome.split(" ")[0]}`} descricao="Suas montagens designadas." />

      <div className="mb-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard titulo="Montagens pendentes" valor={String(ativas.length)} cor="text-amber-600" icone="⏳" />
        <StatCard
          titulo="Valor pendente"
          valor={formatarMoeda(valorPendenteAgg)}
          sub="Montagens ainda não concluídas"
          cor="text-amber-600"
          icone="🧾"
        />
        <StatCard
          titulo="A receber"
          valor={formatarMoeda(aReceberAgg)}
          sub="Sua parte sobre as montagens do mês"
          cor="text-emerald-600"
          icone="💰"
        />
        <StatCard
          titulo="Faturamento do mês"
          valor={formatarMoeda(faturamentoMesAgg)}
          sub="Valor total das montagens do mês"
          cor="text-blue-600"
          icone="📈"
        />
      </div>

      <Card className="mb-8">
        <p className="text-sm font-medium text-slate-500">Sua avaliação</p>
        {totalAvaliacoes === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Você ainda não recebeu avaliações de clientes.
          </p>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-2">
              <Estrelas valor={mediaAvaliacao} tamanho="text-2xl" />
              <span className="text-xl font-bold text-slate-900">
                {mediaAvaliacao.toFixed(1)}
              </span>
              <span className="text-sm text-slate-500">
                ({totalAvaliacoes} avaliação{totalAvaliacoes > 1 ? "ões" : ""})
              </span>
            </div>
            {avaliacoesRecentes.some((a) => a.comentario) ? (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                {avaliacoesRecentes
                  .filter((a) => a.comentario)
                  .map((a) => (
                    <p key={a.id} className="text-sm text-slate-600">
                      &ldquo;{a.comentario}&rdquo;{" "}
                      <span className="text-xs text-slate-400">
                        — {a.montagem.clienteNome}
                      </span>
                    </p>
                  ))}
              </div>
            ) : null}
          </>
        )}
      </Card>

      <h2 className="mb-3 text-base font-semibold text-slate-900">Para fazer</h2>
      {ativas.length === 0 ? (
        <Vazio>Nenhuma montagem pendente no momento. 🎉</Vazio>
      ) : (
        <div className="space-y-3">
          {ativas.map((m) => (
            <Link key={m.id} href={`/montador/montagens/${m.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{m.clienteNome}</p>
                    <p className="text-sm text-slate-500">{m.loja.nome}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {m.dataAgendada ? formatarData(m.dataAgendada) : "Sem data definida"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Nota: {formatarMoeda(m.valorServico)} · Você recebe:{" "}
                      <span className="font-medium text-emerald-600">
                        {formatarMoeda(m.valorMontador)}
                      </span>
                    </p>
                  </div>
                  <Badge className={STATUS_COLOR[m.status as keyof typeof STATUS_COLOR]}>
                    {STATUS_LABEL[m.status as keyof typeof STATUS_LABEL]}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-base font-semibold text-slate-900">
        Concluídas recentemente
      </h2>
      {concluidasRecentes.length === 0 ? (
        <Vazio>Você ainda não concluiu nenhuma montagem.</Vazio>
      ) : (
        <div className="space-y-3">
          {concluidasRecentes.map((m) => (
            <Link key={m.id} href={`/montador/montagens/${m.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{m.clienteNome}</p>
                    <p className="text-sm text-slate-500">{m.loja.nome}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Concluída em {m.concluidoEm ? formatarData(m.concluidoEm) : "Data não disponível"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Nota: {formatarMoeda(m.valorServico)} · Você recebe:{" "}
                      <span className="font-medium text-emerald-600">
                        {formatarMoeda(m.valorMontador)}
                      </span>
                    </p>
                  </div>
                  <Badge
                    className={
                      m.pagoAoMontador
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {m.pagoAoMontador ? "Pago" : "A receber"}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
