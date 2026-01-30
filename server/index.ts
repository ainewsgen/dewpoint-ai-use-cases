import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import authEnhancedRoutes from './routes/auth-enhanced';
import leadsRoutes from './routes/leads';
import cmsRoutes from './routes/cms';
import usersRoutes from './routes/users';
import integrationsRoutes from './routes/integrations';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://dewpoint-ai-use-cases.onrender.com'
        : 'http://localhost:5173',
    credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// Health Check (before other API routes for priority)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authEnhancedRoutes); // Enhanced auth with JWT
app.use('/api/auth', authRoutes); // Legacy auth routes (if needed)
app.use('/api', leadsRoutes);
app.use('/api', cmsRoutes);
app.use('/api/admin', usersRoutes); // User management
app.use('/api', integrationsRoutes); // Enhanced integrations

// Serve static frontend files in production (AFTER API routes)
if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../..');
    app.use(express.static(path.join(staticPath, 'dist')));

    // Catch-all: send index.html for any remaining routes (SPA routing)
    app.use((req, res) => {
        res.sendFile(path.join(staticPath, 'dist', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});
