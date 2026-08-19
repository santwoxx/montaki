// Reconhece se uma montagem veio de um sistema externo integrado por API
// (ver app/api/notas-pendentes/route.ts) pelo formato do id que esse sistema
// usa (`del-<timestamp>`), gravado como numeroPedido no momento em que a
// nota pendente vira montagem. Sem essa checagem, montagens de outras lojas
// parceiras (que não têm nada a ver com essa integração) também apareceriam
// nela à toa. O prefixo é só um exemplo -- ajuste para o que o seu sistema
// externo enviar.
//
// Fica num arquivo à parte (em vez de lib/actions/montagens.ts) porque esse
// é um arquivo "use server" -- só pode exportar Server Actions (funções
// async), e esta é só uma função utilitária síncrona.
export function pareceIdDeIntegracaoExterna(numeroPedido: string | null): numeroPedido is string {
  return typeof numeroPedido === "string" && numeroPedido.startsWith("del-");
}
