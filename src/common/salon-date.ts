/**
 * Datas do salão. O banco guarda os lançamentos financeiros em colunas `DATE`
 * (meia-noite UTC) e os relatórios agrupam por `getUTCMonth()`. Converter um
 * instante para o dia do calendário de São Paulo evita que uma comanda fechada
 * às 22h caia no dia — e às vezes no mês — seguinte.
 */

const SALON_TZ = 'America/Sao_Paulo';

/** Dia do calendário do salão, no formato YYYY-MM-DD. */
export function salonDateString(instant: Date = new Date()): string {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Meia-noite UTC do dia do calendário do salão — pronto para colunas `DATE`. */
export function salonDateOnly(instant: Date = new Date()): Date {
  return new Date(`${salonDateString(instant)}T00:00:00.000Z`);
}

/**
 * YYYY-MM-DD de uma data que JÁ está em meia-noite UTC (vinda do banco ou de
 * `salonDateOnly`). Não use `salonDateString` aqui: converter meia-noite UTC
 * para São Paulo volta um dia.
 */
export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
