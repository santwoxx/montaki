import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { Badge, Button, Card, LinkButton, PageHeader, Select, Vazio } from "@/components/ui";
import { formatarData, formatarMoeda, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
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

  const [lojasSnapshot, montadoresSnapshot] = await Promise.all([
    adminDb.collection("lojas").orderBy("nome", "asc").get(),
    adminDb.collection("users").where("role", "==", "MONTADOR").orderBy("nome", "asc").get(),
  ]);

  const lojas = lojasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  const montadores = montadoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  const lojasMap = new Map();
  lojas.forEach(l => lojasMap.set(l.id, l));

  const montadoresMap = new Map();
  montadores.forEach(m => montadoresMap.set(m.id, m));

  // Firebase allows basic chaining of wheres, but because we also want a dynamic amount of filters,
  // we can use the adminDb.collection reference to chain conditionally.
  let montagensRef: FirebaseFirestore.Query = adminDb.collection("montagens");

  if (status) {
    montagensRef = montagensRef.where("status", "==", status);
  }
  if (lojaId) {
    montagensRef = montagensRef.where("lojaId", "==", lojaId);
  }
  if (montadorId) {
    montagensRef = montagensRef.where("montadorId", "==", montadorId === "nenhum" ? null : montadorId);
  }

  // To avoid requiring complex composite indexes in Firestore for every combination of filters + orderBy,
  // we fetch the filtered subset (up to a reasonable limit) and sort by createdAt in memory.
  const montagensQuery = await montagensRef.limit(500).get();
  
  let rawMontagens = montagensQuery.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  // Sort by createdAt desc
  rawMontagens.sort((a, b) => {
    const timeA = a.criadoEm?.toMillis() || 0;
    const timeB = b.criadoEm?.toMillis() || 0;
    return timeB - timeA;
  });

  // Limit to 100 for display
  rawMontagens = rawMontagens.slice(0, 100);

  // For the selected montagens, we need the count of ocorrencias
  // Fetching all ocorrencias for these IDs to get counts
  const montagemIds = rawMontagens.map(m => m.id);
  const ocorrenciasCountMap = new Map<string, number>();

  if (montagemIds.length > 0) {
    // Firestore "in" queries are limited to 30 items. We chunk it if needed.
    const chunkArray = (arr: string[], size: number) => 
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

    const chunks = chunkArray(montagemIds, 30);
    for (const chunk of chunks) {
      const occSnapshot = await adminDb.collection("ocorrencias").where("montagemId", "in", chunk).get();
      occSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const currentCount = ocorrenciasCountMap.get(data.montagemId) || 0;
        ocorrenciasCountMap.set(data.montagemId, currentCount + 1);
      });
    }
  }

  const montagens = rawMontagens.map(m => ({
    ...m,
    loja: lojasMap.get(m.lojaId) || { nome: "Loja Excluída" },
    montador: montadoresMap.get(m.montadorId) || null,
    _count: { ocorrencias: ocorrenciasCountMap.get(m.id) || 0 },
    dataAgendada: m.dataAgendada?.toDate() || null
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
