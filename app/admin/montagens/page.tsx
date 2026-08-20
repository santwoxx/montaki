import Link from "next/link";
import {
  contarOcorrenciasPorMontagem,
  listarLojas,
  listarMontadores,
  listarMontagens,
  porId,
} from "@/lib/db";
import { Button, Card, LinkButton, PageHeader, Select } from "@/components/ui";
import MontagensListClient from "./MontagensListClient";

export default async function MontagensPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    lojaId?: string;
    montadorId?: string;
  }>;
}) {
  const { status, lojaId, montadorId } = await searchParams;

  const [lojas, montadores, todasMontagens, ocorrenciasPorMontagem] =
    await Promise.all([
      listarLojas(),
      listarMontadores(),
      listarMontagens(),
      contarOcorrenciasPorMontagem(),
    ]);

  const lojasPorId = porId(lojas);
  const montadoresPorId = porId(montadores);

  const montagens = todasMontagens
    .filter((m) => {
      if (status && m.status !== status) return false;
      if (lojaId && m.lojaId !== lojaId) return false;
      if (montadorId === "nenhum" && m.montadorId) return false;
      if (montadorId && montadorId !== "nenhum" && m.montadorId !== montadorId) {
        return false;
      }
      return true;
    })
    .slice(0, 100)
    .map((m) => ({
      id: m.id,
      clienteNome: m.clienteNome,
      feitoPorAdm: m.feitoPorAdm,
      dataAgendada: m.dataAgendada,
      valorServico: m.valorServico,
      status: m.status,
      pagoPelaLoja: m.pagoPelaLoja,
      loja: { nome: lojasPorId.get(m.lojaId)?.nome ?? "Loja removida" },
      montador: m.montadorId
        ? { nome: montadoresPorId.get(m.montadorId)?.nome ?? "Montador removido" }
        : null,
      _count: { ocorrencias: ocorrenciasPorMontagem.get(m.id) ?? 0 },
    }));

  return (
    <div>
      <PageHeader
        titulo="Montagens"
        descricao="Todos os pedidos de montagem cadastrados."
        acoes={<LinkButton href="/admin/montagens/nova">+ Nova montagem</LinkButton>}
      />

      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-3">
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </Select>
          <Select name="lojaId" defaultValue={lojaId ?? ""}>
            <option value="">Todas as lojas</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
          <Select name="montadorId" defaultValue={montadorId ?? ""}>
            <option value="">Todos os montadores</option>
            <option value="nenhum">Sem montador</option>
            {montadores.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-4 sm:col-span-3">
            <Button type="submit" className="px-5 py-2.5">
              Filtrar
            </Button>
            <Link
              href="/admin/montagens"
              className="text-sm font-medium text-slate-500 hover:text-navy transition-colors"
            >
              Limpar filtros
            </Link>
          </div>
        </form>
      </Card>

      <MontagensListClient montagens={montagens} />
    </div>
  );
}
