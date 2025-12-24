import { inspect } from "util";

enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3,
}

const COLORS = {
	Reset: "\x1b[0m",
	Bright: "\x1b[1m",
	Dim: "\x1b[2m",
	Red: "\x1b[31m",
	Yellow: "\x1b[33m",
	Green: "\x1b[32m",
	Cyan: "\x1b[36m",
	Gray: "\x1b[90m",
};

const LEVEL_COLORS = {
	[LogLevel.ERROR]: COLORS.Red,
	[LogLevel.WARN]: COLORS.Yellow,
	[LogLevel.INFO]: COLORS.Green,
	[LogLevel.DEBUG]: COLORS.Cyan,
};

class Logger {
	private static currentLevel: LogLevel = LogLevel.INFO;

	static setLevel(level: LogLevel): void {
		this.currentLevel = level;
	}
	private static shouldLog(level: LogLevel): boolean {
		return level <= this.currentLevel;
	}

	private static getTimestamp(): string {
		const now = new Date();
		return now.toISOString();
	}

	private static format(level: LogLevel, component: string, message: string, data?: unknown): void {
		if (!this.shouldLog(level)) return;

		const timestamp = this.getTimestamp();
		const color = LEVEL_COLORS[level];
		const levelName = LogLevel[level].padEnd(5);

		const prefix = `${COLORS.Gray}[${timestamp}]${COLORS.Reset} ${color}[${levelName}]${COLORS.Reset} ${COLORS.Bright}[${component}]${COLORS.Reset}`;

		const logFn = level === LogLevel.ERROR ? console.error : console.log;

		if (data !== undefined) {
			const formattedData =
				typeof data === "object" ? inspect(data, { colors: true, depth: null, breakLength: Infinity }) : data;

			logFn(`${prefix} ${message}`, formattedData);
		} else {
			logFn(`${prefix} ${message}`);
		}
	}

	static error(component: string, message: string, error?: unknown): void {
		this.format(LogLevel.ERROR, component, message, error);
	}

	static warn(component: string, message: string, data?: unknown): void {
		this.format(LogLevel.WARN, component, message, data);
	}

	static info(component: string, message: string, data?: unknown): void {
		this.format(LogLevel.INFO, component, message, data);
	}

	static debug(component: string, message: string, data?: unknown): void {
		this.format(LogLevel.DEBUG, component, message, data);
	}
}

const nekoShareLogger = (message: string, ...rest: string[]) => {
	Logger.info("App", message, rest.length > 0 ? rest : undefined);
};

export { Logger, LogLevel, nekoShareLogger };
