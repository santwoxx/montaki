"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import {
  COLECOES,
  atualizarMontagem,
  buscarMontagem,
  buscarNotaPendente,
  buscarUsuario,
  criarDocumento,
  listarOcorrenciasDaMontagem,
  removerDocumento,
  removerVarios,
} from "@/lib/db";
import { firestore } from "@/lib/firebase/admin";
import { getSession, requireAdmin } from "@/lib/auth";
import { paraNumeroBr } from "@/lib/format";
import { pareceIdDeIntegracaoExterna } from "@/lib/integracaoExterna";
import type { StatusMontagem } from "@/lib/tipos";

function paraNumero(valor: FormDataEntryValue | null, padrao = 0) {
  const numero = paraNumeroBr(String(valor ?? ""));
  return Number.isFinite(numero) ? numero : padrao;
}

function paraData(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const data = new Date(`${texto}T12:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100;
}

const TAMANHO_MAXIMO_MANUAL = 20 * 1024 * 1024; // 20 MB

// Manual/instrução que o admin anexa ao designar o montador — aceita
// qualquer tipo de arquivo (imagem, PDF etc.), não só imagens como as
// fotos de comprovante. Retorna undefined se nenhum arquivo novo foi
// enviado (nesse caso o valor já salvo na montagem não é mexido).
async function processarManual(formData: FormData, caminhoErro: string) {
  const manual = formData.get("manual");
  if (!(manual instanceof File) || manual.size === 0) return undefined;

  if (manual.size > TAMANHO_MAXIMO_MANUAL) {
    redirect(
      `${caminhoErro}?erro=${encodeURIComponent(
        "O arquivo do manual é muito grande (máximo 20 MB)."
      )}`
    );
  }

  const partesNome = manual.name.split(".");
  const extensao = partesNome.length > 1 ? partesNome.pop() : "bin";
  const blob = await put(`manuais/${Date.now()}.${extensao}`, manual, {
    access: "public",
    addRandomSuffix: true,
  });

  return {
    manualUrl: blob.url,
    manualNomeArquivo: manual.name,
    manualTipo: manual.type || null,
  };
}

export async function criarMontagemAction(formData: FormData) {
  await requireAdmin();

  const notaPendenteId = String(formData.get("notaPendenteId") || "").trim();
  const lojaId = String(formData.get("lojaId") || "");
  const montadorIdBruto = String(formData.get("montadorId") || "");
  const feitoPorAdm = montadorIdBruto === "ADM";
  const montadorId = montadorIdBruto && montadorIdBruto !== "ADM" ? montadorIdBruto : null;

  const clienteNome = String(formData.get("clienteNome") || "").trim();
  const clienteTelefone = String(formData.get("clienteTelefone") || "").trim();
  const clienteEndereco = String(formData.get("clienteEndereco") || "").trim();
  const numeroPedido = String(formData.get("numeroPedido") || "").trim();
  const descricaoServico = String(formData.get("descricaoServico") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();

  const valorServico = arredondar(paraNumero(formData.get("valorServico")));
  const valorAssistencia = arredondar(paraNumero(formData.get("valorAssistencia")));
  const percentualMontador = arredondar(paraNumero(formData.get("percentualMontador")));
  const dataAgendada = paraData(formData.get("dataAgendada"));

  if (!lojaId || !clienteNome || !clienteEndereco || !descricaoServico || valorServico <= 0) {
    redirect(
      `/admin/montagens/nova?erro=${encodeURIComponent(
        "Preencha loja, cliente, endereço, serviço e um valor válido."
      )}`
    );
  }

  let manualDados = await processarManual(formData, "/admin/montagens/nova");

  // Se veio de uma nota pendente (ex: pedido enviado por um sistema externo
  // integrado) e o admin não anexou um manual próprio, usa a foto de
  // referência do produto que veio junto com a nota como manual/instrução
  // da montagem.
  const notaPendente = notaPendenteId ? await buscarNotaPendente(notaPendenteId) : null;
  if (!manualDados && notaPendente?.fotoReferenciaUrl) {
    manualDados = {
      manualUrl: notaPendente.fotoReferenciaUrl,
      manualNomeArquivo: "Foto do produto (sistema externo)",
      manualTipo: null,
    };
  }

  const valorMontador = arredondar((valorServico * percentualMontador) / 100);
  const agora = new Date();

  const montagemId = await criarDocumento(COLECOES.montagens, {
    lojaId,
    montadorId,
    clienteNome,
    clienteTelefone: clienteTelefone || null,
    clienteEndereco,
    numeroPedido: numeroPedido || null,
    descricaoServico,
    observacoes: observacoes || null,
    valorServico,
    valorAssistencia,
    percentualMontador,
    valorMontador,
    feitoPorAdm,
    dataAgendada,
    status: "PENDENTE" satisfies StatusMontagem,
    pagoPelaLoja: false,
    pagoAoMontador: false,
    concluidoEm: null,
    fotoProdutoUrl: null,
    assinaturaMontador: null,
    assinaturaCliente: null,
    manualUrl: null,
    manualNomeArquivo: null,
    manualTipo: null,
    notificadoCentralSyncEm: null,
    avaliacaoSolicitadaEm: null,
    orcamentoId: null,
    createdAt: agora,
    updatedAt: agora,
    ...manualDados,
  });

  // Some com a nota pendente agora que virou uma montagem de verdade —
  // melhor esforço, não impede a criação se falhar.
  if (notaPendenteId) {
    await removerDocumento(COLECOES.notasPendentes, notaPendenteId).catch(() => {});
  }

  revalidatePath("/admin/montagens");
  revalidatePath("/admin");
  revalidatePath("/montador");
  redirect(
    `/admin/montagens/${montagemId}?sucesso=${encodeURIComponent(
      "Montagem criada com sucesso."
    )}`
  );
}

export async function atualizarMontagemAction(id: string, formData: FormData) {
  await requireAdmin();

  const lojaId = String(formData.get("lojaId") || "");
  const montadorIdBruto = String(formData.get("montadorId") || "");
  const feitoPorAdm = montadorIdBruto === "ADM";
  const montadorId = montadorIdBruto && montadorIdBruto !== "ADM" ? montadorIdBruto : null;

  const clienteNome = String(formData.get("clienteNome") || "").trim();
  const clienteTelefone = String(formData.get("clienteTelefone") || "").trim();
  const clienteEndereco = String(formData.get("clienteEndereco") || "").trim();
  const numeroPedido = String(formData.get("numeroPedido") || "").trim();
  const descricaoServico = String(formData.get("descricaoServico") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();
  const status = String(formData.get("status") || "PENDENTE") as StatusMontagem;

  const valorServico = arredondar(paraNumero(formData.get("valorServico")));
  const valorAssistencia = arredondar(paraNumero(formData.get("valorAssistencia")));
  const percentualMontador = arredondar(paraNumero(formData.get("percentualMontador")));
  const dataAgendada = paraData(formData.get("dataAgendada"));

  if (!lojaId || !clienteNome || !clienteEndereco || !descricaoServico || valorServico <= 0) {
    redirect(
      `/admin/montagens/${id}?erro=${encodeURIComponent(
        "Preencha loja, cliente, endereço, serviço e um valor válido."
      )}`
    );
  }

  const manualDados = await processarManual(formData, `/admin/montagens/${id}`);

  const valorMontador = arredondar((valorServico * percentualMontador) / 100);

  const atual = await buscarMontagem(id);
  const concluidoEm =
    status === "CONCLUIDO" ? atual?.concluidoEm ?? new Date() : null;

  await atualizarMontagem(id, {
    lojaId,
    montadorId,
    clienteNome,
    clienteTelefone: clienteTelefone || null,
    clienteEndereco,
    numeroPedido: numeroPedido || null,
    descricaoServico,
    observacoes: observacoes || null,
    valorServico,
    valorAssistencia,
    ...manualDados,
    percentualMontador,
    valorMontador,
    feitoPorAdm,
    dataAgendada,
    status,
    concluidoEm,
  });

  revalidatePath("/admin/montagens");
  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/admin");
  // Essa ação pode mudar o que o montador vê (montador designado, manual
  // anexado, endereço etc.), então o lado dele também precisa atualizar.
  revalidatePath("/montador");
  revalidatePath(`/montador/montagens/${id}`);
  redirect(
    `/admin/montagens/${id}?sucesso=${encodeURIComponent("Montagem atualizada.")}`
  );
}

async function podeGerenciar(montagemId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const montagem = await buscarMontagem(montagemId);
  if (!montagem) redirect(session.role === "ADMIN" ? "/admin/montagens" : "/montador");

  if (session.role === "MONTADOR" && montagem.montadorId !== session.sub) {
    redirect("/montador");
  }

  return { session, montagem };
}

function caminhoDetalhe(role: "ADMIN" | "MONTADOR", id: string) {
  return role === "ADMIN" ? `/admin/montagens/${id}` : `/montador/montagens/${id}`;
}

export async function atualizarClienteMontadorAction(id: string, formData: FormData) {
  const { session } = await podeGerenciar(id);
  const caminho = caminhoDetalhe(session.role, id);

  const clienteEndereco = String(formData.get("clienteEndereco") || "").trim();
  const clienteTelefone = String(formData.get("clienteTelefone") || "").trim();

  if (!clienteEndereco) {
    redirect(
      `${caminho}?erro=${encodeURIComponent("Informe o endereço do cliente.")}`
    );
  }

  await atualizarMontagem(id, {
    clienteEndereco,
    clienteTelefone: clienteTelefone || null,
  });

  revalidatePath("/admin/montagens");
  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/montador");
  revalidatePath(`/montador/montagens/${id}`);
  redirect(
    `${caminho}?sucesso=${encodeURIComponent("Endereço do cliente atualizado.")}`
  );
}

export async function atualizarStatusAction(id: string, novoStatus: StatusMontagem) {
  const { session } = await podeGerenciar(id);

  await atualizarMontagem(id, {
    status: novoStatus,
    concluidoEm: novoStatus === "CONCLUIDO" ? new Date() : null,
  });

  revalidatePath("/admin/montagens");
  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/montador");
  revalidatePath("/montador/financeiro");
  revalidatePath(`/montador/montagens/${id}`);
  redirect(caminhoDetalhe(session.role, id));
}

// Endpoint do sistema externo (ex: um app de pedidos/entregas próprio) que
// recebe a confirmação de montagem (fica esperando revisão de um admin de
// lá, não marca nada como concluído sozinho). Ambas as variáveis de
// ambiente abaixo são opcionais: sem elas, essa integração fica desativada
// e o resto do sistema funciona normalmente. Chave própria
// (EXTERNAL_INTEGRATION_WEBHOOK_KEY) -- de propósito diferente de
// EXTERNAL_INTEGRATION_API_KEY (usada em notas-pendentes/route.ts): aquela
// chave sai no bundle público do sistema externo (ele não tem backend
// próprio), então nunca pode dobrar como segredo de um canal que precisa
// continuar privado. Sem fallback embutido no código -- se não estiver
// configurada, o envio simplesmente falha (ver avisarIntegracaoExterna).
const EXTERNAL_INTEGRATION_CONFIRMATION_URL = process.env.EXTERNAL_INTEGRATION_WEBHOOK_URL;
const EXTERNAL_INTEGRATION_SHARED_KEY = process.env.EXTERNAL_INTEGRATION_WEBHOOK_KEY;

// O montador que concluir aqui NÃO avisa o sistema externo sozinho -- ver
// confirmarEnvioIntegracaoExternaAction, que só um admin consegue disparar,
// depois de revisar a montagem concluída no painel dele (pode ter sido
// concluída por qualquer montador da equipe).
async function avisarIntegracaoExterna(
  deliveryId: string,
  montadorNome: string | null,
  assemblerSignature: string,
  customerSignature: string,
  photo: string
): Promise<boolean> {
  if (!EXTERNAL_INTEGRATION_CONFIRMATION_URL || !EXTERNAL_INTEGRATION_SHARED_KEY) {
    console.warn("EXTERNAL_INTEGRATION_WEBHOOK_URL/KEY não configuradas -- não é possível avisar o sistema externo.");
    return false;
  }
  try {
    const resposta = await fetch(EXTERNAL_INTEGRATION_CONFIRMATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-montaki-key": EXTERNAL_INTEGRATION_SHARED_KEY,
      },
      body: JSON.stringify({ deliveryId, montadorNome, assemblerSignature, customerSignature, photo }),
    });
    if (!resposta.ok) {
      console.warn("Sistema externo recusou a confirmação de montagem:", resposta.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Falha ao avisar o sistema externo sobre a montagem concluída:", e);
    return false;
  }
}

export async function concluirComProvaAction(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const montagem = await buscarMontagem(id);
  if (!montagem) redirect("/montador");
  if (session.role !== "MONTADOR" || montagem.montadorId !== session.sub) {
    redirect("/montador");
  }

  const erro = (mensagem: string) =>
    redirect(
      `/montador/montagens/${id}?erro=${encodeURIComponent(mensagem)}`
    );

  const foto = formData.get("foto");
  const assinaturaMontador = String(formData.get("assinaturaMontador") || "");
  const assinaturaCliente = String(formData.get("assinaturaCliente") || "");

  if (!(foto instanceof File) || foto.size === 0) {
    erro("Tire uma foto do produto montado antes de concluir.");
    return;
  }
  if (!foto.type.startsWith("image/")) {
    erro("O arquivo da foto precisa ser uma imagem.");
    return;
  }
  if (foto.size > 8 * 1024 * 1024) {
    erro("A foto é muito grande (máximo 8 MB).");
    return;
  }
  if (!assinaturaMontador.startsWith("data:image/")) {
    erro("Falta a sua assinatura.");
    return;
  }
  if (!assinaturaCliente.startsWith("data:image/")) {
    erro("Falta a assinatura do cliente.");
    return;
  }

  const extensao = foto.type.split("/")[1] || "jpg";
  const blob = await put(`montagens/${id}-${Date.now()}.${extensao}`, foto, {
    access: "public",
    addRandomSuffix: true,
  });

  await atualizarMontagem(id, {
    status: "CONCLUIDO" satisfies StatusMontagem,
    concluidoEm: new Date(),
    fotoProdutoUrl: blob.url,
    assinaturaMontador,
    assinaturaCliente,
  });

  // Não avisa o sistema externo aqui, mesmo que a montagem tenha vindo de lá
  // -- isso fica pro admin confirmar depois de revisar (ver
  // confirmarEnvioIntegracaoExternaAction), já que quem concluiu pode ter
  // sido qualquer montador da equipe.

  revalidatePath("/admin/montagens");
  revalidatePath("/montador");
  revalidatePath("/montador/financeiro");
  revalidatePath(`/montador/montagens/${id}`);
  revalidatePath(`/admin/montagens/${id}`);
  redirect(`/montador/montagens/${id}`);
}

// Disparada pelo admin no painel dele depois de revisar uma montagem
// concluída por ele ou por um funcionário -- só nesse clique o sistema
// externo é avisado (assinaturas + foto), nunca automaticamente.
export async function confirmarEnvioIntegracaoExternaAction(id: string) {
  await requireAdmin();

  const montagem = await buscarMontagem(id);
  if (!montagem) redirect("/admin/montagens");

  if (!pareceIdDeIntegracaoExterna(montagem.numeroPedido)) {
    redirect(`/admin/montagens/${id}`);
  }
  if (montagem.status !== "CONCLUIDO") {
    redirect(
      `/admin/montagens/${id}?erro=${encodeURIComponent(
        "Marque a montagem como concluída (foto + assinaturas) antes de confirmar o envio ao sistema externo."
      )}`
    );
  }

  const montador = montagem.montadorId ? await buscarUsuario(montagem.montadorId) : null;

  const sucesso = await avisarIntegracaoExterna(
    montagem.numeroPedido,
    montador?.nome ?? null,
    montagem.assinaturaMontador ?? "",
    montagem.assinaturaCliente ?? "",
    montagem.fotoProdutoUrl ?? ""
  );

  if (!sucesso) {
    redirect(
      `/admin/montagens/${id}?erro=${encodeURIComponent(
        "Não consegui avisar o sistema externo agora. Tente de novo em instantes."
      )}`
    );
  }

  await atualizarMontagem(id, { notificadoCentralSyncEm: new Date() });

  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/admin");
  redirect(
    `/admin/montagens/${id}?sucesso=${encodeURIComponent("Sistema externo avisado da conclusão.")}`
  );
}

const TIPOS_OCORRENCIA = ["CLIENTE_AUSENTE", "PECA_DANIFICADA", "REAGENDAR", "OUTRO"] as const;

export async function registrarOcorrenciaAction(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const montagem = await buscarMontagem(id);
  if (!montagem) redirect("/montador");
  if (session.role !== "MONTADOR" || montagem.montadorId !== session.sub) {
    redirect("/montador");
  }

  const erro = (mensagem: string) =>
    redirect(`/montador/montagens/${id}?erro=${encodeURIComponent(mensagem)}`);

  const tipoBruto = String(formData.get("tipo") || "");
  if (!TIPOS_OCORRENCIA.includes(tipoBruto as (typeof TIPOS_OCORRENCIA)[number])) {
    erro("Selecione o que aconteceu na visita.");
    return;
  }
  const tipo = tipoBruto as (typeof TIPOS_OCORRENCIA)[number];
  const observacao = String(formData.get("observacao") || "").trim();

  let fotoUrl: string | null = null;
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    if (!foto.type.startsWith("image/")) {
      erro("O arquivo da foto precisa ser uma imagem.");
      return;
    }
    if (foto.size > 8 * 1024 * 1024) {
      erro("A foto é muito grande (máximo 8 MB).");
      return;
    }
    const extensao = foto.type.split("/")[1] || "jpg";
    const blob = await put(`ocorrencias/${id}-${Date.now()}.${extensao}`, foto, {
      access: "public",
      addRandomSuffix: true,
    });
    fotoUrl = blob.url;
  }

  // Registrar a ocorrência e devolver a montagem para "pendente" precisa
  // acontecer junto: um lote garante que não sobre uma ocorrência sem o
  // status correspondente (era a transação do Postgres).
  const db = firestore();
  const lote = db.batch();
  lote.set(db.collection(COLECOES.ocorrencias).doc(), {
    montagemId: id,
    tipo,
    observacao: observacao || null,
    fotoUrl,
    criadoEm: new Date(),
  });
  lote.update(db.collection(COLECOES.montagens).doc(id), {
    status: "PENDENTE" satisfies StatusMontagem,
    updatedAt: new Date(),
  });
  await lote.commit();

  revalidatePath("/admin/montagens");
  revalidatePath("/montador");
  revalidatePath(`/montador/montagens/${id}`);
  revalidatePath(`/admin/montagens/${id}`);
  redirect(
    `/montador/montagens/${id}?sucesso=${encodeURIComponent(
      "Ocorrência registrada. O administrador vai ver isso no sistema."
    )}`
  );
}

export async function alternarPagamentoLojaAction(id: string) {
  await requireAdmin();
  const montagem = await buscarMontagem(id);
  if (!montagem) redirect("/admin/montagens");

  await atualizarMontagem(id, { pagoPelaLoja: !montagem.pagoPelaLoja });

  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  redirect(`/admin/montagens/${id}`);
}

export async function alternarPagamentoMontadorAction(id: string) {
  await requireAdmin();
  const montagem = await buscarMontagem(id);
  if (!montagem) redirect("/admin/montagens");

  await atualizarMontagem(id, { pagoAoMontador: !montagem.pagoAoMontador });

  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  // O pagamento afeta diretamente o que o montador vê no painel dele (o
  // valor "a receber" some da lista assim que marcado como pago) — sem
  // isso o painel do montador ficava com dado desatualizado até expirar
  // o cache por conta própria.
  revalidatePath("/montador");
  revalidatePath("/montador/financeiro");
  revalidatePath(`/montador/montagens/${id}`);
  redirect(`/admin/montagens/${id}`);
}

export async function excluirMontagemAction(id: string) {
  await requireAdmin();

  // O Postgres apagava em cascata o que dependia da montagem; aqui isso é
  // explícito, senão sobrariam ocorrências e avaliação órfãs ocupando
  // espaço e contando nas médias dos montadores.
  const ocorrencias = await listarOcorrenciasDaMontagem(id);
  await removerVarios(
    COLECOES.ocorrencias,
    ocorrencias.map((o) => o.id)
  );
  // A avaliação é gravada com o mesmo id da montagem.
  await removerDocumento(COLECOES.avaliacoes, id).catch(() => {});
  await removerDocumento(COLECOES.montagens, id);

  revalidatePath("/admin/montagens");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  revalidatePath("/admin/montadores");
  revalidatePath("/montador");
  revalidatePath("/montador/financeiro");
  redirect(
    `/admin/montagens?sucesso=${encodeURIComponent("Montagem excluída.")}`
  );
}
