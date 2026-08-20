"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { adminDb } from "@/lib/firebase-admin";
import { getSession, requireAdmin } from "@/lib/auth";
import { paraNumeroBr } from "@/lib/format";
import { pareceIdDeIntegracaoExterna } from "@/lib/integracaoExterna";

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

  let notaPendente: { fotoReferenciaUrl: string | null } | null = null;
  if (notaPendenteId) {
    const notaDoc = await adminDb.collection("notasPendentes").doc(notaPendenteId).get();
    if (notaDoc.exists) {
      notaPendente = notaDoc.data() as any;
    }
  }
  if (!manualDados && notaPendente?.fotoReferenciaUrl) {
    manualDados = {
      manualUrl: notaPendente.fotoReferenciaUrl,
      manualNomeArquivo: "Foto do produto (sistema externo)",
      manualTipo: null,
    };
  }

  const valorMontador = arredondar((valorServico * percentualMontador) / 100);
  const now = new Date();

  const montagemData = {
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
    status: "PENDENTE",
    pagoPelaLoja: false,
    pagoAoMontador: false,
    criadoEm: now,
    atualizadoEm: now,
    ...(manualDados || {}),
  };

  const montagemRef = await adminDb.collection("montagens").add(montagemData);

  if (notaPendenteId) {
    await adminDb.collection("notasPendentes").doc(notaPendenteId).delete().catch(() => {});
  }

  revalidatePath("/admin/montagens");
  revalidatePath("/admin");
  revalidatePath("/montador");
  redirect(
    `/admin/montagens/${montagemRef.id}?sucesso=${encodeURIComponent(
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
  const status = String(formData.get("status") || "PENDENTE") as
    | "PENDENTE"
    | "EM_ANDAMENTO"
    | "CONCLUIDO"
    | "CANCELADO";

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

  const montagemDoc = await adminDb.collection("montagens").doc(id).get();
  const atual = montagemDoc.exists ? montagemDoc.data() : null;
  const concluidoEm = status === "CONCLUIDO" ? (atual?.concluidoEm ?? new Date()) : null;

  await adminDb.collection("montagens").doc(id).update({
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
    ...(manualDados || {}),
    percentualMontador,
    valorMontador,
    feitoPorAdm,
    dataAgendada,
    status,
    concluidoEm,
    atualizadoEm: new Date(),
  });

  revalidatePath("/admin/montagens");
  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/admin");
  revalidatePath("/montador");
  revalidatePath(`/montador/montagens/${id}`);
  redirect(
    `/admin/montagens/${id}?sucesso=${encodeURIComponent("Montagem atualizada.")}`
  );
}

async function podeGerenciar(montagemId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const montagemDoc = await adminDb.collection("montagens").doc(montagemId).get();
  if (!montagemDoc.exists) redirect(session.role === "ADMIN" ? "/admin/montagens" : "/montador");

  const montagem = { id: montagemDoc.id, ...montagemDoc.data() } as any;

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

  await adminDb.collection("montagens").doc(id).update({ 
    clienteEndereco, 
    clienteTelefone: clienteTelefone || null,
    atualizadoEm: new Date()
  });

  revalidatePath("/admin/montagens");
  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/montador");
  revalidatePath(`/montador/montagens/${id}`);
  redirect(
    `${caminho}?sucesso=${encodeURIComponent("Endereço do cliente atualizado.")}`
  );
}

export async function atualizarStatusAction(
  id: string,
  novoStatus: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO"
) {
  const { session } = await podeGerenciar(id);

  await adminDb.collection("montagens").doc(id).update({
    status: novoStatus,
    concluidoEm: novoStatus === "CONCLUIDO" ? new Date() : null,
    atualizadoEm: new Date()
  });

  revalidatePath("/admin/montagens");
  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/montador");
  revalidatePath("/montador/financeiro");
  revalidatePath(`/montador/montagens/${id}`);
  redirect(caminhoDetalhe(session.role, id));
}

const EXTERNAL_INTEGRATION_CONFIRMATION_URL = process.env.EXTERNAL_INTEGRATION_WEBHOOK_URL;
const EXTERNAL_INTEGRATION_SHARED_KEY = process.env.EXTERNAL_INTEGRATION_WEBHOOK_KEY;

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

  const montagemDoc = await adminDb.collection("montagens").doc(id).get();
  if (!montagemDoc.exists) redirect("/montador");
  
  const montagem = montagemDoc.data() as any;
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

  await adminDb.collection("montagens").doc(id).update({
    status: "CONCLUIDO",
    concluidoEm: new Date(),
    fotoProdutoUrl: blob.url,
    assinaturaMontador,
    assinaturaCliente,
    atualizadoEm: new Date()
  });

  revalidatePath("/admin/montagens");
  revalidatePath("/montador");
  revalidatePath("/montador/financeiro");
  revalidatePath(`/montador/montagens/${id}`);
  revalidatePath(`/admin/montagens/${id}`);
  redirect(`/montador/montagens/${id}`);
}

export async function confirmarEnvioIntegracaoExternaAction(id: string) {
  await requireAdmin();

  const montagemDoc = await adminDb.collection("montagens").doc(id).get();
  if (!montagemDoc.exists) redirect("/admin/montagens");
  
  const montagem = montagemDoc.data() as any;

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

  let montadorNome = null;
  if (montagem.montadorId) {
    const userDoc = await adminDb.collection("users").doc(montagem.montadorId).get();
    if (userDoc.exists) {
      montadorNome = userDoc.data()?.nome || null;
    }
  }

  const sucesso = await avisarIntegracaoExterna(
    montagem.numeroPedido,
    montadorNome,
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

  await adminDb.collection("montagens").doc(id).update({ 
    notificadoCentralSyncEm: new Date(),
    atualizadoEm: new Date()
  });

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

  const montagemDoc = await adminDb.collection("montagens").doc(id).get();
  if (!montagemDoc.exists) redirect("/montador");
  
  const montagem = montagemDoc.data() as any;
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

  let fotoUrl: string | undefined = undefined;
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

  const batch = adminDb.batch();
  
  const novaOcorrenciaRef = adminDb.collection("ocorrencias").doc();
  batch.set(novaOcorrenciaRef, {
    montagemId: id,
    tipo,
    observacao: observacao || null,
    fotoUrl: fotoUrl || null,
    criadoEm: new Date()
  });

  batch.update(adminDb.collection("montagens").doc(id), {
    status: "PENDENTE",
    atualizadoEm: new Date()
  });

  await batch.commit();

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
  const montagemDoc = await adminDb.collection("montagens").doc(id).get();
  if (!montagemDoc.exists) redirect("/admin/montagens");
  
  const montagem = montagemDoc.data() as any;

  await adminDb.collection("montagens").doc(id).update({
    pagoPelaLoja: !montagem.pagoPelaLoja,
    atualizadoEm: new Date()
  });

  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  redirect(`/admin/montagens/${id}`);
}

export async function alternarPagamentoMontadorAction(id: string) {
  await requireAdmin();
  const montagemDoc = await adminDb.collection("montagens").doc(id).get();
  if (!montagemDoc.exists) redirect("/admin/montagens");

  const montagem = montagemDoc.data() as any;

  await adminDb.collection("montagens").doc(id).update({
    pagoAoMontador: !montagem.pagoAoMontador,
    atualizadoEm: new Date()
  });

  revalidatePath(`/admin/montagens/${id}`);
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  revalidatePath("/montador");
  revalidatePath("/montador/financeiro");
  revalidatePath(`/montador/montagens/${id}`);
  redirect(`/admin/montagens/${id}`);
}

export async function excluirMontagemAction(id: string) {
  await requireAdmin();

  // In a real system, you'd also delete associated occurrences, but for parity we just delete the montagem
  await adminDb.collection("montagens").doc(id).delete();

  revalidatePath("/admin/montagens");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  revalidatePath("/montador");
  revalidatePath("/montador/financeiro");
  redirect(
    `/admin/montagens?sucesso=${encodeURIComponent("Montagem excluída.")}`
  );
}
