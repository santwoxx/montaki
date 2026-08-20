import { requireMontador } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
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

  const [
    usuarioDoc,
    lojasSnapshot,
    comissoesSnapshot,
    montagensSnapshot,
    avaliacoesSnapshot
  ] = await Promise.all([
    adminDb.collection("users").doc(session.sub).get(),
    adminDb.collection("lojas").where("ativo", "==", true).orderBy("nome", "asc").get(),
    adminDb.collection("comissoesLoja").where("montadorId", "==", session.sub).get(),
    adminDb.collection("montagens")
      .where("montadorId", "==", session.sub)
      .where("status", "==", "CONCLUIDO")
      .where("concluidoEm", ">=", inicioMes)
      .get(),
    adminDb.collection("avaliacoes").where("montadorId", "==", session.sub).get()
  ]);

  if (!usuarioDoc.exists) return null;

  const usuario = { id: usuarioDoc.id, ...usuarioDoc.data() as any };
  
  const lojas = lojasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  
  const comissoes = comissoesSnapshot.docs.map(doc => doc.data() as any);
  const comissaoPorLoja = new Map(comissoes.map((c) => [c.lojaId, c.percentual]));

  const rawMontagens = montagensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  const ganhoMesAgg = rawMontagens.reduce((soma, m) => soma + (m.valorMontador || 0), 0);

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

  // We need to fetch montagem details for the top 10 avaliacoes to get clienteNome
  const avaliacoesRecentesBase = rawAvaliacoes.slice(0, 10);
  
  const avaliacoesRecentes = await Promise.all(avaliacoesRecentesBase.map(async (a) => {
    let clienteNome = "Desconhecido";
    if (a.montagemId) {
      // Check if it's already in the montagens we fetched this month
      const m = rawMontagens.find(mont => mont.id === a.montagemId);
      if (m) {
        clienteNome = m.clienteNome;
      } else {
        // Fetch it
        const mDoc = await adminDb.collection("montagens").doc(a.montagemId).get();
        if (mDoc.exists) {
          clienteNome = mDoc.data()?.clienteNome || "Desconhecido";
        }
      }
    }
    return { ...a, montagem: { clienteNome } };
  }));

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
              {formatarMoeda(ganhoMesAgg)}
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
                      {a.montagem.clienteNome}
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
