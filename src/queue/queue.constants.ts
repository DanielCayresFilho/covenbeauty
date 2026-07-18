export const NOTIFICATIONS_QUEUE = 'notifications';

export enum NotificationJob {
  WelcomeClient = 'welcome-client',
}

// Fila de tarefas agendadas (cron).
export const BIRTHDAYS_QUEUE = 'birthdays';
export const GENERATE_BIRTHDAYS_JOB = 'generate-monthly-birthdays';

export interface WelcomeClientPayload {
  clientId: string;
  email: string;
  fullName: string;
}
