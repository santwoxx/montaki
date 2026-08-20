import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { formatarData, formatarMoeda, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import { Badge, Card, LinkButton, PageHeader, StatCard, Vazio } from "@/components/ui";
import { GraficoFaturamento, type PontoFaturamento } from "@/components/GraficoFaturamento";

const MESES_PARA_GRAFICO = 6;

export default async function AdminDashboardPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const inicioJanela = new Date(inicioMes);
  inicioJanela.setMonth(inicioJanela.getMonth() - (MESES_PARA_GRAFICO - 1));

  // Fetch all necessary data from Firestore
  // To avoid complex composite index errors out of the box, we fetch broad sets 
  // and filter in memory since the dataset for 6 months is small.
  
  const [
    montagensSnapshot,
    usersSnapshot,
    lojasSnapshot,
    notasPendentesSnapshot
  ] = await Promise.all([
    adminDb.collection("montagens").get(),
    adminDb.collection("users").where("role", "==", "MONTADOR").where("ativo", "==", true).get(),
    adminDb.collection("lojas").get(),
    adminDb.collection("notasPendentes").get(),
  ]);

  const allMontagens = montagensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  
  // Create maps for relationships
  const usersMap = new Map();
  usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() }));
  
  const lojasMap = new Map();
  lojasSnapshot.docs.forEach(doc => lojasMap.set(doc.id, { id: doc.id, ...doc.data() }));

  let pendentes = 0;
  let emAndamento = 0;
  let naoAtribuidas = 0;
  let aPagarMontador = 0;
  let faturamentoServico = 0;
  let faturamentoAssistencia = 0;
  let concluidasMes = 0;
  const montadoresAtivos = usersSnapshot.size;
  const notasPendentesCount = notasPendentesSnapshot.size;
  
  const aguardandoConfirmacaoIntegracaoExterna: any[] = [];
  const proximas: any[] = [];
  const montagensParaGrafico: any[] = [];

  for (const m of allMontagens) {
    // Parsing dates from Firestore Timestamps
    const createdAt = m.criadoEm?.toDate() || new Date(0);
    const concluidoEm = m.concluidoEm?.toDate();
    const dataAgendada = m.dataAgendada?.toDate();

    if (m.status === "PENDENTE") pendentes++;
    if (m.status === "EM_ANDAMENTO") emAndamento++;
    
    if (!m.montadorId && m.status !== "CANCELADO") {
      naoAtribuidas++;
    }

    if (m.status === "CONCLUIDO" && !m.pagoAoMontador) {
      aPagarMontador += (m.valorMontador || 0);
    }

    if (createdAt >= inicioMes && m.status !== "CANCELADO") {
      faturamentoServico += (m.valorServico || 0);
      faturamentoAssistencia += (m.valorAssistencia || 0);
    }

    if (m.status === "CONCLUIDO" && concluidoEm && concluidoEm >= inicioMes) {
      concluidasMes++;
    }

    if (m.status === "CONCLUIDO" && (m.numeroPedido || "").startsWith("del-") && !m.notificadoCentralSyncEm) {
      aguardandoConfirmacaoIntegracaoExterna.push({
        id: m.id,
        clienteNome: m.clienteNome,
        montador: usersMap.get(m.montadorId)
      });
    }

    if (m.status === "PENDENTE" || m.status === "EM_ANDAMENTO") {
      proximas.push({
        ...m,
        createdAt,
        dataAgendada,
        loja: lojasMap.get(m.lojaId) || { nome: "Loja Excluída" },
        montador: usersMap.get(m.montadorId)
      });
    }

    if (m.status !== "CANCELADO" && createdAt >= inicioJanela) {
      montagensParaGrafico.push({
        createdAt,
        valorServico: m.valorServico || 0
      });
    }
  }

  // Ordenar próximas montagens (dataAgendada asc, createdAt desc)
  proximas.sort((a, b) => {
    if (a.dataAgendada && !b.dataAgendada) return -1;
    if (!a.dataAgendada && b.dataAgendada) return 1;
    if (a.dataAgendada && b.dataAgendada) {
      if (a.dataAgendada.getTime() !== b.dataAgendada.getTime()) {
        return a.dataAgendada.getTime() - b.dataAgendada.getTime();
      }
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  
  const proximasTop6 = proximas.slice(0, 6);

  const aguardandoTop5 = aguardandoConfirmacaoIntegracaoExterna.slice(0, 5);

  const dadosFaturamento: PontoFaturamento[] = Array.from({ length: MESES_PARA_GRAFICO }, (_, i) => {
    const data = new Date(inicioMes);
    data.setMonth(data.getMonth() - (MESES_PARA_GRAFICO - 1 - i));
    const total = montagensParaGrafico
      .filter(
        (m) =>
          m.createdAt.getFullYear() === data.getFullYear() &&
          m.createdAt.getMonth() === data.getMonth()
      )
      .reduce((soma, m) => soma + m.valorServico, 0);
    const labelCompleto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return {
      label: data.toLocaleDateString("pt-BR", { month: "short" }).replace(/\.$/, ""),
      labelCompleto: labelCompleto.charAt(0).toUpperCase() + labelCompleto.slice(1),
      valor: total,
      atual: i === MESES_PARA_GRAFICO - 1,
    };
  });

  return (
    <div>
      <PageHeader
        titulo="Painel geral"
        descricao="Visão rápida das montagens e das finanças da sua empresa."
        acoes={
          <LinkButton href="/admin/montagens/nova">+ Nova montagem</LinkButton>
        }
      />

      {notasPendentesCount > 0 ? (
        <Link href="/admin/montagens/nova" className="mb-6 block">
          <Card className="border-gold/40 bg-gold/5 transition-shadow hover:shadow-md">
            <p className="font-semibold text-slate-900">
              📥 {notasPendentesCount} pedido{notasPendentesCount > 1 ? "s" : ""} pendente
              {notasPendentesCount > 1 ? "s" : ""} de sistemas externos
            </p>
            <p className="text-sm text-slate-500">
              Aguardando revisão para virar montagem. Toque para abrir.
            </p>
          </Card>
        </Link>
      ) : null}

      {aguardandoTop5.length > 0 ? (
        <Card className="mb-6 border-blue-100 bg-blue-50/40">
          <p className="font-semibold text-slate-900">
            📤 {aguardandoTop5.length} montagem
            {aguardandoTop5.length > 1 ? "ns" : ""} concluída
            {aguardandoTop5.length > 1 ? "s" : ""} esperando confirmação para o sistema externo
          </p>
          <div className="mt-2 space-y-1">
            {aguardandoTop5.map((m) => (
              <Link
                key={m.id}
                href={`/admin/montagens/${m.id}`}
                className="block text-sm font-medium text-navy hover:text-gold transition-colors"
              >
                {m.clienteNome}
                {m.montador ? ` — concluída por ${m.montador.nome}` : ""}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3">
        <StatCard titulo="Pendentes" valor={String(pendentes)} cor="text-amber-600" icone="⏳" />
        <StatCard titulo="Em andamento" valor={String(emAndamento)} cor="text-blue-600" icone="🔧" />
        <StatCard
          titulo="Sem montador"
          valor={String(naoAtribuidas)}
          cor="text-red-600"
          icone="❓"
        />
        <StatCard
          titulo="A receber das lojas"
          valor={formatarMoeda((faturamentoServico * 0.08) + faturamentoAssistencia)}
          sub="8% sobre o faturamento do mês + Assistências"
          icone="🏬"
        />
        <StatCard
          titulo="A pagar aos montadores"
          valor={formatarMoeda(aPagarMontador)}
          icone="👷"
        />
        <StatCard
          titulo="Faturamento do mês"
          valor={formatarMoeda(faturamentoServico)}
          sub={`${concluidasMes} concluída(s) no mês · ${montadoresAtivos} montador(es) ativo(s)`}
          cor="text-emerald-600"
          icone="📈"
        />
      </div>

      <Card className="mt-8">
        <h2 className="mb-1 text-base font-semibold text-slate-900">
          Faturamento — últimos {MESES_PARA_GRAFICO} meses
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Valor total das montagens criadas em cada mês (exceto canceladas).
        </p>
        <GraficoFaturamento dados={dadosFaturamento} />
      </Card>

      <div className="mt-8">
        <PageHeader titulo="Próximas montagens" />
        {proximasTop6.length === 0 ? (
          <Vazio>Nenhuma montagem pendente ou em andamento no momento.</Vazio>
        ) : (
          <div className="space-y-3">
            {proximasTop6.map((m) => (
              <Link key={m.id} href={`/admin/montagens/${m.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{m.clienteNome}</p>
                      <p className="text-sm text-slate-500">
                        {m.loja.nome} · {m.montador ? m.montador.nome : "Sem montador"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {m.dataAgendada ? `Agendado para ${formatarData(m.dataAgendada)}` : "Sem data definida"}
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
      </div>
    </div>
  );
}
