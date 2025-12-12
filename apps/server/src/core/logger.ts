export enum LogLevel {
	ERROR = "ERROR",
	WARN = "WARN",
	INFO = "INFO",
	DEBUG = "DEBUG",
}

export class Logger {
	private static level: LogLevel = LogLevel.INFO;
	private static verbose: boolean = false;

	static setLevel(level: LogLevel): void {
		this.level = level;
	}

	static setVerbose(verbose: boolean): void {
		this.verbose = verbose;
	}

	private static shouldLog(level: LogLevel): boolean {
		const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
		return levels.indexOf(level) <= levels.indexOf(this.level);
	}

	private static formatMessage(level: LogLevel, component: string, message: string, data?: unknown): string {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${level}] [${component}]`;

		if (data !== undefined) {
			return `${prefix} ${message} ${JSON.stringify(data)}`;
		}

		return `${prefix} ${message}`;
	}

	static error(component: string, message: string, error?: unknown): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			console.error(this.formatMessage(LogLevel.ERROR, component, message, error));
		}
	}

	static warn(component: string, message: string, data?: unknown): void {
		if (this.shouldLog(LogLevel.WARN)) {
			console.warn(this.formatMessage(LogLevel.WARN, component, message, data));
		}
	}

	static info(component: string, message: string, data?: unknown): void {
		if (this.shouldLog(LogLevel.INFO)) {
			console.log(this.formatMessage(LogLevel.INFO, component, message, data));
		}
	}

	static debug(component: string, message: string, data?: unknown): void {
		if (this.verbose && this.shouldLog(LogLevel.DEBUG)) {
			console.log(this.formatMessage(LogLevel.DEBUG, component, message, data));
		}
	}
}

const nekoShareLogger = (message: string, ...rest: string[]) => {
	Logger.info("App", message, rest.length > 0 ? rest : undefined);
};

export { nekoShareLogger };
