import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { montagensIds } = await req.json();

    if (!montagensIds || !Array.isArray(montagensIds) || montagensIds.length === 0) {
      return NextResponse.json(
        { error: "IDs de montagens inválidos" },
        { status: 400 }
      );
    }

    // Buscar as montagens no banco Firestore
    const montagensRef = adminDb.collection("montagens");
    
    // Firestore "in" query limits to 10 elements. If more than 10, needs chunking.
    // For simplicity, assuming montagensIds is <= 10 or we fetch them individually.
    const montagensDocs = await Promise.all(
      montagensIds.map(id => montagensRef.doc(id).get())
    );

    const montagens = montagensDocs.filter(doc => doc.exists).map(doc => ({ id: doc.id, ...doc.data() } as any));

    if (montagens.length !== montagensIds.length) {
      return NextResponse.json(
        { error: "Alguma montagem não foi encontrada" },
        { status: 404 }
      );
    }

    const total = montagens.reduce((acc, curr) => acc + (curr.valorServico || 0), 0);
    const cliente = montagens[0].clienteNome;
    const telefone = montagens[0].clienteTelefone;

    // Criar orcamento
    const orcamentosRef = adminDb.collection("orcamentos");
    const orcamentoDoc = await orcamentosRef.add({
      total,
      cliente,
      telefone,
      status: "PENDENTE",
      criadoEm: new Date(),
    });

    // Vincular montagens ao orcamento (Transaction ou Batch)
    const batch = adminDb.batch();
    montagensIds.forEach((id) => {
      batch.update(montagensRef.doc(id), { orcamentoId: orcamentoDoc.id });
    });
    await batch.commit();

    return NextResponse.json({ orcamentoId: orcamentoDoc.id }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
