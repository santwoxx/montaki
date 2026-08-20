import { requireMontador } from "@/lib/auth";
import {
  buscarUsuario,
  listarAvaliacoesDoMontador,
  listarComissoesDoMontador,
  listarLojas,
  listarMontagensDoMontador,
  resumirAvaliacoes,
} from "@/lib/db";
import { atualizarPerfilAction } from "@/lib/actions/perfil";
import { Alerta, Card, LinkButton, PageHeader, Vazio } from "@/components/ui";
import { PerfilMontadorForm } from "@/components/PerfilMontadorForm";
import { Estrelas } from "@/components/Estrelas";
import { formatarData, formatarMoeda } from "@/lib/format";

export default async function PerfilMontadorPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const session = await requireMontador();
  const { erro, sucesso } = await searchParams;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [usuario, todasLojas, comissoes, montagens, avaliacoes] = await Promise.all([
    buscarUsuario(session.sub),
    listarLojas(),
    listarComissoesDoMontador(session.sub),
    listarMontagensDoMontador(session.sub),
    listarAvaliacoesDoMontador(session.sub),
  ]);

  if (!usuario) return null;

  const lojas = todasLojas.filter((l) => l.ativo);
  const comissaoPorLoja = new Map(comissoes.map((c) => [c.lojaId, c.percentual]));
  const { media: mediaAvaliacao, total: totalAvaliacoes } = resumirAvaliacoes(avaliacoes);
  const avaliacoesRecentes = avaliacoes.slice(0, 10);
  const clientePorMontagem = new Map(montagens.map((m) => [m.id, m.clienteNome]));

  const ganhoMes = montagens
    .filter(
      (m) => m.status === "CONCLUIDO" && m.concluidoEm && m.concluidoEm >= inicioMes
    )
    .reduce((soma, m) => soma + m.valorMontador, 0);

  return (
    <div>
      <PageHeader titulo="Meu perfil" descricao="Seus dados, sua nota e seus ganhos." />

      {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}
      {sucesso ? <Alerta tipo="sucesso">{sucesso}</Alerta> : null}

      <Card className="mb-6">
        <PerfilMontadorForm
          action={atualizarPerfilAction}
          nomeAtual={usuario.nome}
          telefoneAtual={usuario.telefone ?? ""}
          fotoAtualUrl={usuario.fotoUrl}
        />
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
          E-mail de acesso: {usuario.email}
        </p>
      </Card>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Ganho este mês</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatarMoeda(ganhoMes)}
            </p>
          </div>
          <LinkButton href="/montador/financeiro" variante="secundario">
            Ver financeiro completo →
          </LinkButton>
        </div>
      </Card>

      <Card className="mb-6">
        <p className="mb-1 text-sm font-medium text-slate-500">Sua avaliação</p>
        {totalAvaliacoes === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Você ainda não recebeu avaliações de clientes.
          </p>
        ) : (
          <div className="mt-1.5 flex items-center gap-2">
            <Estrelas valor={mediaAvaliacao} tamanho="text-xl" />
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {mediaAvaliacao.toFixed(1)}
            </span>
            <span className="text-sm text-slate-500">
              ({totalAvaliacoes} avaliação{totalAvaliacoes > 1 ? "ões" : ""})
            </span>
          </div>
        )}

        {avaliacoesRecentes.length > 0 ? (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
            {avaliacoesRecentes.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Estrelas valor={a.estrelas} tamanho="text-sm" />
                    <span className="text-sm font-medium text-slate-700">
                      {clientePorMontagem.get(a.montagemId) ?? "Cliente"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{formatarData(a.criadoEm)}</span>
                </div>
                {a.comentario ? (
                  <p className="mt-2 text-sm text-slate-600">&ldquo;{a.comentario}&rdquo;</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card>
        <p className="mb-1 text-base font-semibold text-slate-900">Sua comissão por loja</p>
        <p className="mb-4 text-sm text-slate-500">
          Percentual que você recebe sobre o valor de cada montagem, conforme a loja.
        </p>
        {lojas.length === 0 ? (
          <Vazio>Nenhuma loja cadastrada ainda.</Vazio>
        ) : (
          <div className="space-y-2">
            {lojas.map((loja) => (
              <div
                key={loja.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
              >
                <span className="text-sm text-slate-700">{loja.nome}</span>
                <span className="text-sm font-semibold text-slate-900">
                  {comissaoPorLoja.get(loja.id) ?? 0}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
