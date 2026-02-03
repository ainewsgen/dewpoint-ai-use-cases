import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing. Authentication cannot function securely.");
}
const JWT_SECRET = process.env.JWT_SECRET;

export type AuthRequest = Request & {
    user?: {
        id: number;
        email: string;
        role: string;
    };
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies?.token;

        // Fallback to Authorization Header (Bearer)
        if (!token && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                token = parts[1];
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies?.token;

        // Fallback
        if (!token && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                token = parts[1];
            }
        }

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
            req.user = decoded;
        }
    } catch (error) {
        // Token invalid or expired, but continue anyway
    }

    next();
};
