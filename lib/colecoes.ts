// Nomes das coleções do Firestore e as regras de id que valem em todo o
// sistema.
//
// Fica separado de lib/db.ts (que é marcado como "server-only") porque os
// scripts de manutenção em `scripts/` rodam fora do Next e precisam destes
// mesmos nomes. lib/db.ts reexporta tudo daqui, então o resto do sistema
// continua importando de um lugar só.

export const COLECOES = {
  usuarios: "usuarios",
  lojas: "lojas",
  comissoes: "comissoes",
  montagens: "montagens",
  notasPendentes: "notasPendentes",
  ocorrencias: "ocorrencias",
  avaliacoes: "avaliacoes",
  orcamentos: "orcamentos",
  servicos: "servicos",
} as const;

export type NomeColecao = (typeof COLECOES)[keyof typeof COLECOES];

/**
 * Id determinístico da comissão: faz as vezes da chave única (montador,
 * loja) que o Postgres garantia, impedindo duas comissões para o mesmo par.
 */
export function idComissao(montadorId: string, lojaId: string) {
  return `${montadorId}__${lojaId}`;
}
