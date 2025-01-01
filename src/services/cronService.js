import cron from 'node-cron';
import prisma from '@/lib/prisma';

export class CronService {
  static #instance = null;
  #tasks = [];

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new CronService();
    }
    return this.#instance;
  }

  async startLicenseChecker() {
    // Run every 2 hours
    const task = cron.schedule('0 */2 * * *', async () => {
      console.log('Running license check:', new Date().toISOString());
      
      try {
        const now = new Date();
        
        // Find and update users with expired licenses
        const result = await prisma.user.updateMany({
          where: {
            licenseExpiresAt: {
              lt: now
            },
            NOT: {
              licenseKey: null
            }
          },
          data: {
            licenseKey: null,
            licenseExpiresAt: null,
            licenseClientName: null,
            licenseDomain: null,
            licenseSystemKey: null
          }
        });

        console.log(`Updated ${result.count} expired licenses`);
      } catch (error) {
        console.error('License check error:', error);
      }
    });

    this.#tasks.push(task);
    console.log('License checker scheduled successfully');
  }

  stopAll() {
    this.#tasks.forEach(task => task.stop());
    this.#tasks = [];
    console.log('All cron tasks stopped');
  }
}