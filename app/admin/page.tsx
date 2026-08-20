import Link from "next/link";
import {
  listarLojas,
  listarMontagens,
  listarNotasPendentes,
  listarUsuarios,
  ordenarPor,
  porId,
} from "@/lib/db";
import { pareceIdDeIntegracaoExterna } from "@/lib/integracaoExterna";
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

  // Uma leitura de cada coleção por requisição (memoizada em lib/db.ts) e
  // todos os números derivados aqui: no Firestore, cada consulta separada
  // seria uma volta a mais na rede para responder o mesmo painel.
  const [montagens, usuarios, lojas, notasPendentes] = await Promise.all([
    listarMontagens(),
    listarUsuarios(),
    listarLojas(),
    listarNotasPendentes(),
  ]);

  const lojasPorId = porId(lojas);
  const usuariosPorId = porId(usuarios);
  const naoCanceladas = montagens.filter((m) => m.status !== "CANCELADO");

  const pendentes = montagens.filter((m) => m.status === "PENDENTE").length;
  const emAndamento = montagens.filter((m) => m.status === "EM_ANDAMENTO").length;
  const naoAtribuidas = naoCanceladas.filter((m) => !m.montadorId).length;

  const aPagarAosMontadores = montagens
    .filter((m) => m.status === "CONCLUIDO" && !m.pagoAoMontador)
    .reduce((soma, m) => soma + m.valorMontador, 0);

  const doMes = naoCanceladas.filter((m) => m.createdAt >= inicioMes);
  const faturamentoMes = {
    servico: doMes.reduce((soma, m) => soma + m.valorServico, 0),
    assistencia: doMes.reduce((soma, m) => soma + m.valorAssistencia, 0),
  };

  const concluidasMes = montagens.filter(
    (m) => m.status === "CONCLUIDO" && m.concluidoEm && m.concluidoEm >= inicioMes
  ).length;

  const montadoresAtivos = usuarios.filter(
    (u) => u.role === "MONTADOR" && u.ativo
  ).length;

  const proximas = ordenarPor(
    montagens.filter((m) => m.status === "PENDENTE" || m.status === "EM_ANDAMENTO"),
    ["dataAgendada", "asc"],
    ["createdAt", "desc"]
  )
    .slice(0, 6)
    .map((m) => ({
      ...m,
      loja: lojasPorId.get(m.lojaId) ?? null,
      montador: m.montadorId ? usuariosPorId.get(m.montadorId) ?? null : null,
    }));

  const notasPendentesCount = notasPendentes.length;

  const aguardandoConfirmacaoIntegracaoExterna = montagens
    .filter(
      (m) =>
        m.status === "CONCLUIDO" &&
        pareceIdDeIntegracaoExterna(m.numeroPedido) &&
        !m.notificadoCentralSyncEm
    )
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      clienteNome: m.clienteNome,
      montador: m.montadorId ? usuariosPorId.get(m.montadorId) ?? null : null,
    }));

  const montagensParaGrafico = naoCanceladas.filter(
    (m) => m.createdAt >= inicioJanela
  );

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
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/servicos" variante="secundario">
              📋 Tabela de Preços
            </LinkButton>
            <LinkButton href="/admin/montagens/nova">+ Nova montagem</LinkButton>
          </div>
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

      {aguardandoConfirmacaoIntegracaoExterna.length > 0 ? (
        <Card className="mb-6 border-blue-100 bg-blue-50/40">
          <p className="font-semibold text-slate-900">
            📤 {aguardandoConfirmacaoIntegracaoExterna.length} montagem
            {aguardandoConfirmacaoIntegracaoExterna.length > 1 ? "ns" : ""} concluída
            {aguardandoConfirmacaoIntegracaoExterna.length > 1 ? "s" : ""} esperando confirmação para o sistema externo
          </p>
          <div className="mt-2 space-y-1">
            {aguardandoConfirmacaoIntegracaoExterna.map((m) => (
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
          valor={formatarMoeda(faturamentoMes.servico * 0.08 + faturamentoMes.assistencia)}
          sub="8% sobre o faturamento do mês + Assistências"
          icone="🏬"
        />
        <StatCard
          titulo="A pagar aos montadores"
          valor={formatarMoeda(aPagarAosMontadores)}
          icone="👷"
        />
        <StatCard
          titulo="Faturamento do mês"
          valor={formatarMoeda(faturamentoMes.servico)}
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
        {proximas.length === 0 ? (
          <Vazio>Nenhuma montagem pendente ou em andamento no momento.</Vazio>
        ) : (
          <div className="space-y-3">
            {proximas.map((m) => (
              <Link key={m.id} href={`/admin/montagens/${m.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{m.clienteNome}</p>
                      <p className="text-sm text-slate-500">
                        {m.loja?.nome ?? "Loja removida"} ·{" "}
                        {m.montador ? m.montador.nome : "Sem montador"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {m.dataAgendada ? `Agendado para ${formatarData(m.dataAgendada)}` : "Sem data definida"}
                      </p>
                    </div>
                    <Badge className={STATUS_COLOR[m.status]}>
                      {STATUS_LABEL[m.status]}
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
