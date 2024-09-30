import chalk from 'chalk';
import { time } from './utils.js';

let log = {
    info(msg) {
        console.log(time(), chalk.bold('[Info]'), msg);
    },
};
