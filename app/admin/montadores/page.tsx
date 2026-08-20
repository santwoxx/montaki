import Link from "next/link";
import {
  listarMontadores,
  listarMontagens,
  resumirAvaliacoesPorMontador,
} from "@/lib/db";
import { criarMontadorAction } from "@/lib/actions/montadores";
import { VINCULO_LABEL } from "@/lib/tipos";
import { Alerta, Badge, Card, Field, Input, PageHeader, Select, Vazio } from "@/components/ui";
import { Estrelas } from "@/components/Estrelas";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";

export default async function MontadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const { erro, sucesso } = await searchParams;

  const [equipe, montagens, avaliacaoPorMontador] = await Promise.all([
    listarMontadores(),
    listarMontagens(),
    resumirAvaliacoesPorMontador(),
  ]);

  const montagensPorMontador = new Map<string, number>();
  for (const montagem of montagens) {
    if (!montagem.montadorId) continue;
    montagensPorMontador.set(
      montagem.montadorId,
      (montagensPorMontador.get(montagem.montadorId) ?? 0) + 1
    );
  }

  // Mais recentes primeiro, como na listagem anterior.
  const montadores = [...equipe].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div>
      <PageHeader
        titulo="Equipe"
        descricao="Cadastre funcionários e colaboradores e gerencie o acesso de cada um."
      />

      {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}
      {sucesso ? <Alerta tipo="sucesso">{sucesso}</Alerta> : null}

      <Card className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Novo funcionário ou colaborador
        </h2>
        <form action={criarMontadorAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo">
            <Input name="nome" required placeholder="Ex: João da Silva" />
          </Field>
          <Field label="Telefone (WhatsApp)">
            <Input name="telefone" placeholder="(11) 91234-5678" />
          </Field>
          <Field label="E-mail de acesso">
            <Input type="email" name="email" required placeholder="joao@exemplo.com" />
          </Field>
          <Field label="Senha provisória" hint="Mínimo de 6 caracteres.">
            <Input type="text" name="senha" required minLength={6} placeholder="Ex: monta123" />
          </Field>
          <Field
            label="Vínculo"
            hint="Só organiza a equipe — os dois entram com e-mail e senha e veem o mesmo painel."
          >
            <Select name="vinculo" defaultValue="FUNCIONARIO">
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="COLABORADOR">Colaborador</option>
            </Select>
          </Field>
          <Field label="Comissão Padrão (%)" hint="Usada caso não haja comissão definida para uma loja específica.">
            <Input type="number" name="comissao" min={0} max={100} step="0.5" defaultValue={0} placeholder="Ex: 10" />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Cadastrando…">Cadastrar na equipe</SubmitButton>
          </div>
        </form>
      </Card>

      <h2 className="mb-4 text-base font-semibold text-slate-900">
        Equipe ({montadores.length})
      </h2>

      {montadores.length === 0 ? (
        <Vazio>Nenhum funcionário ou colaborador cadastrado ainda.</Vazio>
      ) : (
        <div className="space-y-3">
          {montadores.map((m) => {
            const avaliacao = avaliacaoPorMontador.get(m.id);
            return (
              <Link key={m.id} href={`/admin/montadores/${m.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar nome={m.nome} fotoUrl={m.fotoUrl} className="shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900">{m.nome}</p>
                        <p className="text-sm text-slate-500">
                          {m.email}
                          {m.telefone ? ` · ${m.telefone}` : ""}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {avaliacao ? (
                            <>
                              <Estrelas valor={avaliacao.media} tamanho="text-sm" />
                              <span className="text-xs text-slate-500">
                                {avaliacao.media.toFixed(1)} ({avaliacao.total})
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Sem avaliações ainda</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.vinculo ? (
                        <Badge className="bg-navy/5 text-navy">
                          {VINCULO_LABEL[m.vinculo]}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-slate-400">
                        {montagensPorMontador.get(m.id) ?? 0} montagem(ns)
                      </span>
                      <Badge
                        className={
                          m.ativo
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }
                      >
                        {m.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
