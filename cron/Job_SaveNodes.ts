import cron from 'node-cron';

export const Job_SaveNodes = () => {
  
  cron.schedule('0 * * * *', () => {
    
  });
};