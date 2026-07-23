import type { AuthUser } from '@/auth/decorators/current-user.decorator';

/**
 * Escopo de propriedade por profissional.
 *
 * Regra: CADA profissional (inclusive o admin) só enxerga o que é dele
 * (owner_id = seu id). A agenda/comandas continuam compartilhadas — só as
 * métricas, o financeiro, os lembretes e os catálogos são por profissional.
 * O histórico antigo (owner_id nulo) é atribuído ao admin numa migração.
 */
export function isAdmin(user: Pick<AuthUser, 'role'>): boolean {
  return user.role === 'ADMIN';
}

/** Cláusula `where` de propriedade — sempre restrita ao próprio usuário. */
export function ownerWhere(user: AuthUser): { ownerId: string } {
  return { ownerId: user.id };
}

/** Escopo por profissional que ATENDE (métricas do início). */
export function professionalWhere(user: AuthUser): { professionalId: string } {
  return { professionalId: user.id };
}

/**
 * Escopo de comandas por profissional: pelo agendamento (atendimento) OU pelo
 * vendedor (comanda de venda de balcão, sem agendamento).
 */
export function comandaOwnerWhere(user: AuthUser): {
  OR: [{ appointment: { professionalId: string } }, { sellerId: string }];
} {
  return {
    OR: [
      { appointment: { professionalId: user.id } },
      { sellerId: user.id },
    ],
  };
}
