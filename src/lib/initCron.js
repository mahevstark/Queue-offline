import { CronService } from '@/services/cronService';

export function initCronJobs() {
  const cronService = CronService.getInstance();
  cronService.startLicenseChecker();
}