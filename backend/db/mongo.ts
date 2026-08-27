import mongoose from 'mongoose';
import { config } from '../config';

export async function connectMongo(uri: string = config.mongoUri): Promise<void> {
  // Errors AFTER the initial connect surface here (initial failures reject below).
  mongoose.connection.on('error', (err) => {
    console.error('mongo: connection error', err);
  });

  await mongoose.connect(uri);
  // Log the db name, never the URI (it may carry credentials).
  console.log(`mongo: connected (db=${mongoose.connection.name})`);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.connection.close();
  console.log('mongo: disconnected');
}
