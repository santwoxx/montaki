import { prisma } from "../lib/prisma";

// Mesmo hash gerado na entrega do sistema para pedrobmcity@gmail.com (senha
// enviada separadamente ao cliente, fora deste repositório público). Rodar
// este seed de novo não sobrescreve a senha se o administrador já existir --
// para trocar a senha depois, use `node -e "console.log(require('bcryptjs').hashSync('nova-senha', 10))"`
// e atualize o usuário direto no banco (ou crie uma tela de troca de senha).
const ADMIN_EMAIL = "pedrobmcity@gmail.com";
const ADMIN_SENHA_HASH =
  "$2b$10$OgdzZG3Hx.mJe805P2lgYOD7FXekBNypgIioLo3/Mr6psa88sqSYS";

async function main() {
  const existente = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existente) {
    console.log(`Usuário ${ADMIN_EMAIL} já existe -- nada a fazer.`);
    return;
  }

  await prisma.user.create({
    data: {
      nome: "Pedro",
      email: ADMIN_EMAIL,
      telefone: "24993210547",
      senha: ADMIN_SENHA_HASH,
      role: "ADMIN",
      ativo: true,
      comissaoPadrao: 0,
    },
  });

  console.log(`Administrador ${ADMIN_EMAIL} criado.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
