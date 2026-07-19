import type { AuthUser } from '@/auth/decorators/current-user.decorator';

/**
 * Escopo de propriedade por profissional.
 *
 * Regra: o ADMIN (dona do salão) enxerga tudo; os demais profissionais só
 * enxergam o que é deles (owner_id = seu id). Registros sem dono (owner_id
 * nulo, ex.: dados antigos) ficam visíveis apenas para o admin.
 */
export function isAdmin(user: Pick<AuthUser, 'role'>): boolean {
  return user.role === 'ADMIN';
}

/** Cláusula `where` de propriedade — vazia para admin, `{ ownerId }` p/ os demais. */
export function ownerWhere(user: AuthUser): { ownerId?: string } {
  return isAdmin(user) ? {} : { ownerId: user.id };
}

/**
 * Escopo por profissional que ATENDE (agenda/analytics). A agenda em si é
 * compartilhada, mas as métricas do início são por profissional.
 * Admin → sem filtro; demais → só o que eles atendem.
 */
export function professionalWhere(user: AuthUser): { professionalId?: string } {
  return isAdmin(user) ? {} : { professionalId: user.id };
}

/** Escopo de comandas por profissional (via o agendamento). */
export function comandaOwnerWhere(
  user: AuthUser,
): { appointment?: { professionalId: string } } {
  return isAdmin(user) ? {} : { appointment: { professionalId: user.id } };
}
