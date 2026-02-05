import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include shadowId
declare global {
    namespace Express {
        interface Request {
            shadowId?: string;
        }
    }
}

export const shadowTracking = (req: Request, res: Response, next: NextFunction) => {
    const shadowId = req.headers['x-shadow-id'];

    if (shadowId && typeof shadowId === 'string') {
        req.shadowId = shadowId;
    }

    next();
};
