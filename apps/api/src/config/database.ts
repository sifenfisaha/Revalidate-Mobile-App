import mysql from 'mysql2/promise';
import { MYSQL_CONFIG } from './env';

// MongoDB imports are optional - only loaded if packages are installed
let MongoClient: any = null;
let mongoose: any = null;
let client: any = null;
let db: any = null;

// Try to load MongoDB packages (optional)
try {
  const mongodb = require('mongodb');
  MongoClient = mongodb.MongoClient;
} catch (e) {
  // MongoDB not installed - that's okay
}

try {
  mongoose = require('mongoose');
} catch (e) {
  // Mongoose not installed - that's okay
}

let mysqlPool: mysql.Pool | null = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revalidation-tracker';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'revalidation-tracker';

/**
 * Connect to MongoDB using native driver
 * Note: Requires 'mongodb' package to be installed
 */
export async function connectMongoDB(): Promise<any> {
  if (!MongoClient) {
    throw new Error('MongoDB package not installed. Install with: pnpm add mongodb');
  }

  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB_NAME);
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Connect to MongoDB using Mongoose
 * Note: Requires 'mongoose' package to be installed
 */
export async function connectMongoose(): Promise<void> {
  if (!mongoose) {
    throw new Error('Mongoose package not installed. Install with: pnpm add mongoose');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
    console.log('✅ Connected to MongoDB via Mongoose');
  } catch (error) {
    console.error('❌ Mongoose connection error:', error);
    throw error;
  }
}

/**
 * Get MongoDB database instance
 */
export function getDatabase(): any {
  if (!db) {
    throw new Error('Database not connected. Call connectMongoDB() first.');
  }
  return db;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
  
  if (mongoose && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('Mongoose connection closed');
  }
}

export { mongoose };

/**
 * MySQL Connection Functions
 */

/**
 * Connect to MySQL database using connection pool
 */
export async function connectMySQL(): Promise<mysql.Pool> {
  if (mysqlPool) {
    return mysqlPool;
  }

  try {
    // HostGator MySQL connection configuration
    // For remote connections, HostGator may require SSL
    const poolConfig: any = {
      host: MYSQL_CONFIG.host,
      port: MYSQL_CONFIG.port,
      user: MYSQL_CONFIG.user,
      password: MYSQL_CONFIG.password,
      database: MYSQL_CONFIG.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // Add connection timeout for remote connections
      connectTimeout: 10000, // 10 seconds
    };

    // For remote HostGator connections, SSL might be required
    // Set MYSQL_SSL=true in .env if SSL is needed
    if (process.env.MYSQL_SSL === 'true') {
      poolConfig.ssl = {
        rejectUnauthorized: false, // HostGator typically uses self-signed certificates
      };
    }

    mysqlPool = mysql.createPool(poolConfig);

    // Test the connection
    const connection = await mysqlPool.getConnection();
    await connection.ping();
    connection.release();

    console.log('✅ Connected to MySQL database');
    return mysqlPool;
  } catch (error) {
    console.error('❌ MySQL connection error:', error);
    throw error;
  }
}

/**
 * Get MySQL connection pool
 */
export function getMySQLPool(): mysql.Pool {
  if (!mysqlPool) {
    throw new Error('MySQL not connected. Call connectMySQL() first.');
  }
  return mysqlPool;
}

/**
 * Close MySQL connection pool
 */
export async function closeMySQL(): Promise<void> {
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
    console.log('MySQL connection pool closed');
  }
}
