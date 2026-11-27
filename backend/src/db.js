import mongoose from "mongoose";

mongoose.set("strictQuery", true);

export async function connectDb(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

export function disconnectDb() {
  return mongoose.disconnect();
}

export const isDbReady = () => mongoose.connection.readyState === 1;
