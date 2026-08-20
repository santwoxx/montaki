// Configurações da implantação que não moram no banco.

/**
 * E-mails padrão dos administradores do sistema. São as contas Google autorizadas a
 * entrar como administrador na primeira vez (bootstrap) e gerenciar a plataforma.
 */
export const EMAILS_ADMIN_PADRAO = [
  "pedrobmcity@gmail.com",
  "brisasofc@gmail.com",
];

export const EMAIL_DONO = "pedrobmcity@gmail.com";

/**
 * E-mails autorizados a virar administrador entrando com o Google.
 *
 * Serve para o primeiro acesso ("bootstrap"): depois que o usuário
 * administrador existe no banco, é o cadastro dele que manda -- entrar com
 * o Google passa a exigir um usuário com papel ADMIN e ativo, esteja o
 * e-mail nesta lista ou não. Configure `ADMIN_EMAILS` (separados por
 * vírgula) no .env caso queira sobrescrever.
 */
export function emailsAdminAutorizados(): string[] {
  const configurados = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return configurados.length > 0 ? configurados : EMAILS_ADMIN_PADRAO;
}

export function ehEmailAdminAutorizado(email: string) {
  return emailsAdminAutorizados().includes(email.trim().toLowerCase());
}
