import type { ReactNode } from "react";
import { adminDb } from "@/lib/firebase-admin";
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

  const [montagemDoc, avaliacoesSnapshot] = await Promise.all([
    adminDb.collection("montagens").doc(id).get(),
    adminDb.collection("avaliacoes").where("montagemId", "==", id).limit(1).get()
  ]);

  if (!montagemDoc.exists) {
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

  const montagemData = montagemDoc.data() as any;

  if (!montagemData.montadorId || montagemData.status !== "CONCLUIDO") {
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

  let montador = null;
  const montadorDoc = await adminDb.collection("users").doc(montagemData.montadorId).get();
  if (montadorDoc.exists) {
    montador = { id: montadorDoc.id, ...montadorDoc.data() as any };
  }

  const avaliacao = avaliacoesSnapshot.empty ? null : {
    id: avaliacoesSnapshot.docs[0].id,
    ...avaliacoesSnapshot.docs[0].data(),
    criadoEm: avaliacoesSnapshot.docs[0].data().criadoEm?.toDate() || new Date(0)
  };

  const montagem = {
    id,
    ...montagemData,
    montador,
    avaliacao
  };

  if (montagem.avaliacao) {
    return (
      <LayoutAvaliacao>
        <Card className="text-center">
          <p className="mb-3 text-base font-semibold text-slate-900">
            Obrigado pela sua avaliação!
          </p>
          <div className="mb-2 flex justify-center">
            <Estrelas valor={montagem.avaliacao.estrelas} tamanho="text-3xl" />
          </div>
          {montagem.avaliacao.comentario ? (
            <p className="mt-3 text-sm text-slate-600">
              &ldquo;{montagem.avaliacao.comentario}&rdquo;
            </p>
          ) : null}
          <p className="mt-4 text-xs text-slate-400">
            Avaliado em {formatarData(montagem.avaliacao.criadoEm)}
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
          {montagem.montador?.nome?.split(" ")[0] ?? "quem te atendeu"}.
        </p>
        {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}
        <AvaliarForm
          action={enviarAvaliacaoAction.bind(null, montagem.id)}
          nomeMontador={montagem.montador?.nome?.split(" ")[0] ?? "quem te atendeu"}
        />
      </Card>
    </LayoutAvaliacao>
  );
}
