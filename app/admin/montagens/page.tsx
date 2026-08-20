import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, LinkButton, PageHeader, Select, Vazio } from "@/components/ui";
import { formatarData, formatarMoeda, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import type { Prisma, StatusMontagem } from "@/app/generated/prisma/client";
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

  const [lojas, montadores] = await Promise.all([
    prisma.loja.findMany({ orderBy: { nome: "asc" } }),
    prisma.user.findMany({ where: { role: "MONTADOR" }, orderBy: { nome: "asc" } }),
  ]);

  const where: Prisma.MontagemWhereInput = {};
  if (status) where.status = status as StatusMontagem;
  if (lojaId) where.lojaId = lojaId;
  if (montadorId) where.montadorId = montadorId === "nenhum" ? null : montadorId;

  const montagens = await prisma.montagem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { loja: true, montador: true, _count: { select: { ocorrencias: true } } },
    take: 100,
  });

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
