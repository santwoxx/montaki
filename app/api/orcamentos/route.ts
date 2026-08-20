import { NextRequest, NextResponse } from "next/server";
import { COLECOES, buscarMontagens, criarDocumento } from "@/lib/db";
import { firestore } from "@/lib/firebase/admin";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Gerar orçamento expõe dados de clientes e valores das montagens
  // escolhidas: é ação de administrador. Antes esta rota respondia a
  // qualquer um que soubesse o endereço.
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { montagensIds } = await req.json();

    if (!montagensIds || !Array.isArray(montagensIds) || montagensIds.length === 0) {
      return NextResponse.json(
        { error: "IDs de montagens inválidos" },
        { status: 400 }
      );
    }

    const montagens = await buscarMontagens(montagensIds);

    if (montagens.length !== montagensIds.length) {
      return NextResponse.json(
        { error: "Alguma montagem não foi encontrada" },
        { status: 404 }
      );
    }

    // Calcula o valor total do orçamento com base no valorServico das montagens
    const total = montagens.reduce((acc, curr) => acc + curr.valorServico, 0);

    // Usa o nome e telefone do primeiro cliente como padrão para o orçamento,
    // se o administrador quiser gerar um orçamento único para esse cliente
    const cliente = montagens[0].clienteNome;
    const telefone = montagens[0].clienteTelefone;

    const orcamentoId = await criarDocumento(COLECOES.orcamentos, {
      total,
      cliente,
      telefone,
      status: "PENDENTE",
      criadoEm: new Date(),
      validoAte: null,
    });

    // Vincula as montagens ao orçamento -- o "connect" do Prisma. Num lote
    // só, para não sobrar montagem apontando para um orçamento pela metade.
    const db = firestore();
    const lote = db.batch();
    for (const montagem of montagens) {
      lote.update(db.collection(COLECOES.montagens).doc(montagem.id), {
        orcamentoId,
        updatedAt: new Date(),
      });
    }
    await lote.commit();

    return NextResponse.json({ orcamentoId }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
