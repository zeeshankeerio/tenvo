/**
 * Structured Logging Service
 * 
 * Lightweight, structured JSON logger designed for Next.js Server Actions.
 * No external dependencies -- uses native console methods with structured output.
 * 
 * Features:
 * - Structured JSON output in production, pretty-printed in development
 * - Log levels: debug, info, warn, error, fatal
 * - Context tracking (module, userId, businessId, requestId)
 * - Error serialization with stack traces
 * - Performance timing helpers
 * - Action-level logging wrapper
 * 
 * Usage:
 *   import { logger, createModuleLogger } from '@/lib/services/logging/logger';
 * 
 *   // Direct usage
 *   logger.info('Invoice created', { invoiceId: '123', module: 'invoices' });
 * 
 *   // Module-scoped logger
 *   const log = createModuleLogger('inventory');
 *   log.info('Stock added', { productId: '456', quantity: 10 });
 * 
 *   // Performance timing
 *   const timer = logger.startTimer('heavy-query');
 *   // ... do work ...
 *   timer.end({ rowCount: 500 }); // logs duration automatically
 */

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};

// Determine minimum log level from environment
const MIN_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'debug'] || 0;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Serialize an Error object into a plain object for JSON logging
 */
function serializeError(error) {
    if (!error) return undefined;
    if (typeof error === 'string') return { message: error };

    return {
        name: error.name,
        message: error.message,
        stack: IS_PRODUCTION ? undefined : error.stack,
        code: error.code,
        ...(error.cause ? { cause: serializeError(error.cause) } : {}),
    };
}

/**
 * Create a structured log entry
 */
function createLogEntry(level, message, context = {}) {
    const { error, ...meta } = context;

    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
        ...(error ? { error: serializeError(error) } : {}),
    };

    // Remove undefined values
    return Object.fromEntries(
        Object.entries(entry).filter(([, v]) => v !== undefined)
    );
}

/**
 * Output a log entry to the appropriate console method
 */
function outputLog(level, entry) {
    if (LOG_LEVELS[level] < MIN_LOG_LEVEL) return;

    const output = IS_PRODUCTION
        ? JSON.stringify(entry)
        : formatPretty(level, entry);

    switch (level) {
        case 'debug':
            console.debug(output);
            break;
        case 'info':
            console.info(output);
            break;
        case 'warn':
            console.warn(output);
            break;
        case 'error':
        case 'fatal':
            console.error(output);
            break;
        default:
            console.log(output);
    }
}

/**
 * Pretty-format a log entry for development
 */
function formatPretty(level, entry) {
    const levelColors = {
        debug: '\x1b[36m',   // cyan
        info: '\x1b[32m',    // green
        warn: '\x1b[33m',    // yellow
        error: '\x1b[31m',   // red
        fatal: '\x1b[35m',   // magenta
    };

    const reset = '\x1b[0m';
    const dim = '\x1b[2m';
    const color = levelColors[level] || '';

    const { timestamp, level: _, message, error: err, ...meta } = entry;
    const time = dim + new Date(timestamp).toLocaleTimeString() + reset;
    const lvl = color + level.toUpperCase().padEnd(5) + reset;
    const mod = meta.module ? ` ${dim}[${meta.module}]${reset}` : '';
    const metaStr = Object.keys(meta).length > (meta.module ? 1 : 0)
        ? ` ${dim}${JSON.stringify(
            Object.fromEntries(Object.entries(meta).filter(([k]) => k !== 'module'))
        )}${reset}`
        : '';
    const errStr = err
        ? `\n  ${color}↳ ${err.name || 'Error'}: ${err.message}${reset}${err.stack ? `\n  ${dim}${err.stack}${reset}` : ''}`
        : '';

    return `${time} ${lvl}${mod} ${message}${metaStr}${errStr}`;
}

// --- Main Logger Object -----------------------------------------------------

export const logger = {
    debug(message, context = {}) {
        outputLog('debug', createLogEntry('debug', message, context));
    },

    info(message, context = {}) {
        outputLog('info', createLogEntry('info', message, context));
    },

    warn(message, context = {}) {
        outputLog('warn', createLogEntry('warn', message, context));
    },

    error(message, context = {}) {
        outputLog('error', createLogEntry('error', message, context));
    },

    fatal(message, context = {}) {
        outputLog('fatal', createLogEntry('fatal', message, context));
    },

    /**
     * Start a performance timer
     * @param {string} label - Timer label
     * @param {object} context - Additional context
     * @returns {{ end: (extraContext?: object) => void }}
     */
    startTimer(label, context = {}) {
        const start = performance.now();
        return {
            end(extraContext = {}) {
                const durationMs = Math.round(performance.now() - start);
                logger.info(`${label} completed`, {
                    ...context,
                    ...extraContext,
                    durationMs,
                    performance: durationMs > 1000 ? 'slow' : durationMs > 500 ? 'moderate' : 'fast',
                });
            },
        };
    },

    /**
     * Log a server action invocation with timing
     * @param {string} actionName - Name of the server action
     * @param {object} params - Action parameters (sanitized)
     * @param {Function} fn - The action function to execute
     * @returns {Promise<any>} Result of the action
     */
    async logAction(actionName, params, fn) {
        const timer = this.startTimer(actionName, {
            module: 'action',
            action: actionName,
            ...(params.businessId ? { businessId: params.businessId } : {}),
            ...(params.userId ? { userId: params.userId } : {}),
        });

        try {
            const result = await fn();
            timer.end({ success: true });
            return result;
        } catch (error) {
            timer.end({ success: false });
            this.error(`Action failed: ${actionName}`, {
                module: 'action',
                action: actionName,
                error,
            });
            throw error;
        }
    },
};

// --- Module-Scoped Logger Factory -------------------------------------------

/**
 * Create a logger scoped to a specific module
 * Automatically attaches the module name to every log entry
 * 
 * @param {string} moduleName - Module name (e.g., 'inventory', 'invoices')
 * @returns {object} Logger with module context pre-attached
 */
export function createModuleLogger(moduleName) {
    return {
        debug: (message, ctx = {}) => logger.debug(message, { module: moduleName, ...ctx }),
        info: (message, ctx = {}) => logger.info(message, { module: moduleName, ...ctx }),
        warn: (message, ctx = {}) => logger.warn(message, { module: moduleName, ...ctx }),
        error: (message, ctx = {}) => logger.error(message, { module: moduleName, ...ctx }),
        fatal: (message, ctx = {}) => logger.fatal(message, { module: moduleName, ...ctx }),
        startTimer: (label, ctx = {}) => logger.startTimer(label, { module: moduleName, ...ctx }),
    };
}

export default logger;
