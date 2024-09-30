import moment from 'moment';
import chalk from 'chalk';

export function time() {
    return moment().format('YYYY/MM/DD HH:mm:ss');
}

export function sleep(n) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

export let log = {
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
    line() {
        console.log();
    },
};
