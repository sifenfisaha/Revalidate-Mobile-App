import app from './app';
import { connectMySQL } from './config/database';

const PORT = process.env.PORT || 3000;

// Initialize database connection
async function startServer() {
  try {
    // Connect to MySQL
    await connectMySQL();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
      console.log(`📝 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
