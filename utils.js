import moment from 'moment';

export function time() {
    return moment().format('YYYY/MM/DD HH:mm:ss');
}

export function sleep(n) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}
