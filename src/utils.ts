import moment from 'moment';
import chalk from 'chalk';

export function time(): string {
    return moment().format('YYYY/MM/DD HH:mm:ss');
}

export function sleep(n: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, n);
    });
}

export const log = {
    info(...msg: unknown[]): void {
        console.log(chalk.cyan(time()), chalk.bold('[Info]'), ...msg);
    },
    error(...msg: unknown[]): void {
        console.error(chalk.cyan(time()), chalk.red.bold('[Error]'), ...msg);
    },
    warn(...msg: unknown[]): void {
        console.log(chalk.cyan(time()), chalk.yellow.bold('[Warn]'), ...msg);
    },
    success(...msg: unknown[]): void {
        console.log(chalk.cyan(time()), chalk.green.bold('[Success]'), ...msg);
    },
    direct(...msg: unknown[]): void {
        console.log(chalk.magenta(...msg));
    },
    title(...msg: unknown[]): void {
        console.log(chalk.cyan.bold(...msg));
    },
    line(): void {
        console.log();
    },
};

export async function asset(assetPath: string): Promise<string> {
    const filePath: string = Deno.build.standalone ? import.meta.dirname + '/../' + assetPath : assetPath;
    return await Deno.readTextFile(filePath);
}
