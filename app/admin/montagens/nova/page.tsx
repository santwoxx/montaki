import Link from "next/link";
import { listarComissoes, listarLojas, listarMontadores, listarNotasPendentes, porId } from "@/lib/db";
import { criarMontagemAction } from "@/lib/actions/montagens";
import { Alerta, Card, PageHeader } from "@/components/ui";
import { NovaMontagemForm } from "@/components/NovaMontagemForm";

export default async function NovaMontagemPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  const [todasLojas, todosMontadores, comissoes, notasPendentesBrutas] =
    await Promise.all([
      listarLojas(),
      listarMontadores(),
      listarComissoes(),
      listarNotasPendentes(),
    ]);

  const lojas = todasLojas.filter((l) => l.ativo);
  const montadores = todosMontadores.filter((m) => m.ativo);
  const montadoresPorId = porId(todosMontadores);

  const notasPendentes = notasPendentesBrutas.map((n) => ({
    id: n.id,
    numeroPedido: n.numeroPedido,
    clienteNome: n.clienteNome,
    clienteTelefone: n.clienteTelefone,
    clienteEndereco: n.clienteEndereco,
    descricaoServico: n.descricaoServico,
    valorServico: n.valorServico,
    dataAgendada: n.dataAgendada ? n.dataAgendada.toISOString() : null,
    observacoes: n.observacoes,
    fotoReferenciaUrl: n.fotoReferenciaUrl,
    montadorSugeridoId: n.montadorSugeridoId,
    montadorSugeridoNome: n.montadorSugeridoId
      ? montadoresPorId.get(n.montadorSugeridoId)?.nome ?? null
      : null,
    lojaNomeSugerida: n.lojaNomeSugerida,
    lojaCnpjSugerido: n.lojaCnpjSugerido,
  }));

  return (
    <div>
      <p className="mb-2">
        <Link href="/admin/montagens" className="text-sm font-medium text-navy hover:text-gold transition-colors">
          ← Voltar para montagens
        </Link>
      </p>
      <PageHeader
        titulo="Nova montagem"
        descricao="Cadastre um novo pedido e, se quiser, já designe o montador."
      />

      {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}

      <Card>
        <NovaMontagemForm
          action={criarMontagemAction}
          lojas={lojas}
          montadores={montadores}
          comissoes={comissoes}
          notasPendentes={notasPendentes}
        />
      </Card>
    </div>
  );
}
