import { format } from '@std/datetime';
import { cyan, red, yellow, green, magenta, bold } from '@std/fmt/colors';

export function time(): string {
    return format(new Date(), 'yyyy/MM/dd HH:mm:ss');
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
        console.log(cyan(time()), bold('[Info]'), ...msg);
    },
    error(...msg: unknown[]): void {
        console.error(cyan(time()), bold(red('[Error]')), ...msg);
    },
    warn(...msg: unknown[]): void {
        console.log(cyan(time()), bold(yellow('[Warn]')), ...msg);
    },
    success(...msg: unknown[]): void {
        console.log(cyan(time()), bold(green('[Success]')), ...msg);
    },
    direct(...msg: unknown[]): void {
        console.log(magenta(msg.join(' ')));
    },
    title(...msg: unknown[]): void {
        console.log(bold(cyan(msg.join(' '))));
    },
    line(): void {
        console.log();
    },
};

export async function asset(assetPath: string): Promise<string> {
    const filePath: string = Deno.build.standalone ? import.meta.dirname + '/../' + assetPath : assetPath;
    return await Deno.readTextFile(filePath);
}
