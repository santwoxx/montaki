import type { ReactNode } from "react";
import { buscarAvaliacaoDaMontagem, buscarMontagem, buscarUsuario } from "@/lib/db";
import { enviarAvaliacaoAction } from "@/lib/actions/avaliacoes";
import { AvaliarForm } from "@/components/AvaliarForm";
import { Estrelas } from "@/components/Estrelas";
import { Alerta, Card } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { formatarData } from "@/lib/format";

function LayoutAvaliacao({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo tamanho="md" className="mx-auto mb-3" />
          <p className="text-lg font-bold uppercase tracking-wide text-navy font-display">
            Mont<span className="text-gold">aki</span>
          </p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-slate-400">
          Fale com a gente:{" "}
          <a
            href="https://wa.me/5524993210547"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-navy hover:underline"
          >
            (24) 99321-0547
          </a>
        </p>
      </div>
    </div>
  );
}

export default async function AvaliarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;

  const montagem = await buscarMontagem(id);

  if (!montagem || !montagem.montadorId || montagem.status !== "CONCLUIDO") {
    return (
      <LayoutAvaliacao>
        <Card className="text-center">
          <p className="text-slate-700">
            Este link de avaliação não está disponível. Se você acha que isso é
            um erro, entre em contato com quem fez a sua montagem.
          </p>
        </Card>
      </LayoutAvaliacao>
    );
  }

  const [avaliacao, montador] = await Promise.all([
    buscarAvaliacaoDaMontagem(id),
    buscarUsuario(montagem.montadorId),
  ]);

  if (avaliacao) {
    return (
      <LayoutAvaliacao>
        <Card className="text-center">
          <p className="mb-3 text-base font-semibold text-slate-900">
            Obrigado pela sua avaliação!
          </p>
          <div className="mb-2 flex justify-center">
            <Estrelas valor={avaliacao.estrelas} tamanho="text-3xl" />
          </div>
          {avaliacao.comentario ? (
            <p className="mt-3 text-sm text-slate-600">
              &ldquo;{avaliacao.comentario}&rdquo;
            </p>
          ) : null}
          <p className="mt-4 text-xs text-slate-400">
            Avaliado em {formatarData(avaliacao.criadoEm)}
          </p>
        </Card>
      </LayoutAvaliacao>
    );
  }

  return (
    <LayoutAvaliacao>
      <Card>
        <p className="mb-1 text-center text-base font-semibold text-slate-900">
          Como foi a montagem?
        </p>
        <p className="mb-5 text-center text-sm text-slate-500">
          Sua opinião ajuda a avaliar o trabalho de{" "}
          {montador?.nome.split(" ")[0] ?? "quem te atendeu"}.
        </p>
        {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}
        <AvaliarForm
          action={enviarAvaliacaoAction.bind(null, montagem.id)}
          nomeMontador={montador?.nome.split(" ")[0] ?? "quem te atendeu"}
        />
      </Card>
    </LayoutAvaliacao>
  );
}
