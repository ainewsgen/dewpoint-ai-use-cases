import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import leadsRoutes from './routes/leads';
import cmsRoutes from './routes/cms';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check (before other API routes for priority)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', leadsRoutes);
app.use('/api', cmsRoutes);

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
