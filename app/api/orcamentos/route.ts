import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { montagensIds } = await req.json();

    if (!montagensIds || !Array.isArray(montagensIds) || montagensIds.length === 0) {
      return NextResponse.json(
        { error: "IDs de montagens inválidos" },
        { status: 400 }
      );
    }

    // Buscar as montagens no banco para calcular o valor total
    const montagens = await prisma.montagem.findMany({
      where: {
        id: { in: montagensIds },
      },
    });

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

    // Cria o orçamento e vincula as montagens
    const orcamento = await prisma.orcamento.create({
      data: {
        total,
        cliente,
        telefone,
        montagens: {
          connect: montagensIds.map((id) => ({ id })),
        },
      },
    });

    return NextResponse.json({ orcamentoId: orcamento.id }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
