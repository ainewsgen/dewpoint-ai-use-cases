export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    AUDIT = 'AUDIT'
}

class Logger {
    private log(level: LogLevel, message: string, meta?: any) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };
        console.log(JSON.stringify(logEntry));
    }

    info(message: string, meta?: any) {
        this.log(LogLevel.INFO, message, meta);
    }

    warn(message: string, meta?: any) {
        this.log(LogLevel.WARN, message, meta);
    }

    error(message: string, error?: any) {
        const meta = error instanceof Error ? {
            error: error.message,
            stack: error.stack
        } : { error };
        this.log(LogLevel.ERROR, message, meta);
    }

    audit(action: string, actor: string, details?: any) {
        this.log(LogLevel.AUDIT, action, { actor, ...details });
    }
}

export const logger = new Logger();
