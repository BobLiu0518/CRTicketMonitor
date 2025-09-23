import moment from 'moment';
import chalk from 'chalk';

export function time() {
    return moment().format('YYYY/MM/DD HH:mm:ss');
}

export function sleep(n) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, n);
    });
}

export const log = {
    info(...msg) {
        console.log(chalk.cyan(time()), chalk.bold('[Info]'), ...msg);
    },
    error(...msg) {
        console.error(chalk.cyan(time()), chalk.red.bold('[Error]'), ...msg);
    },
    warn(...msg) {
        console.log(chalk.cyan(time()), chalk.yellow.bold('[Warn]'), ...msg);
    },
    success(...msg) {
        console.log(chalk.cyan(time()), chalk.green.bold('[Success]'), ...msg);
    },
    direct(...msg) {
        console.log(chalk.magenta(...msg));
    },
    title(...msg) {
        console.log(chalk.cyan.bold(...msg));
    },
    line() {
        console.log();
    },
};

export async function asset(assetPath) {
    const filePath = Deno.build.standalone ? import.meta.dirname + "/../" + assetPath : assetPath;
    return await Deno.readTextFile(filePath);
}
