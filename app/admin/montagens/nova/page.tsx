import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { criarMontagemAction } from "@/lib/actions/montagens";
import { Alerta, Card, PageHeader } from "@/components/ui";
import { NovaMontagemForm } from "@/components/NovaMontagemForm";

export default async function NovaMontagemPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  const [lojasSnapshot, montadoresSnapshot, comissoesSnapshot, notasPendentesSnapshot] = await Promise.all([
    adminDb.collection("lojas").where("ativo", "==", true).orderBy("nome", "asc").get(),
    adminDb.collection("users").where("role", "==", "MONTADOR").where("ativo", "==", true).orderBy("nome", "asc").get(),
    adminDb.collection("comissoesLoja").get(),
    adminDb.collection("notasPendentes").orderBy("criadaEm", "asc").get(),
  ]);

  const lojas = lojasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  
  const montadores = montadoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  
  const comissoes = comissoesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  const notasPendentesBrutas = notasPendentesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  
  const notasPendentes = notasPendentesBrutas.map((n) => {
    let montadorSugeridoNome = null;
    if (n.montadorSugeridoId) {
      const montadorDoc = montadores.find(m => m.id === n.montadorSugeridoId);
      if (montadorDoc) {
        montadorSugeridoNome = montadorDoc.nome;
      }
    }

    return {
      id: n.id,
      numeroPedido: n.numeroPedido || null,
      clienteNome: n.clienteNome || "",
      clienteTelefone: n.clienteTelefone || null,
      clienteEndereco: n.clienteEndereco || "",
      descricaoServico: n.descricaoServico || "",
      valorServico: n.valorServico || 0,
      dataAgendada: n.dataAgendada ? n.dataAgendada.toDate().toISOString() : null,
      observacoes: n.observacoes || null,
      fotoReferenciaUrl: n.fotoReferenciaUrl || null,
      montadorSugeridoId: n.montadorSugeridoId || null,
      montadorSugeridoNome,
      lojaNomeSugerida: n.lojaNomeSugerida || null,
      lojaCnpjSugerido: n.lojaCnpjSugerido || null,
    };
  });

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
