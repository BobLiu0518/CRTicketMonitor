import ChinaRailway from './cr.ts';
import Notifications, { type NotificationBase } from './notifications.ts';
import { sleep, time, log, asset } from './utils.ts';
import type { Config, SearchConfig, TrainInfo, SeatCategory, TicketCheckResult } from './types.ts';

let config: Config;
const notifications: NotificationBase[] = [];

function die(err?: unknown): void {
    if (err && err != 'SIGINT') {
        const errorMsg = err instanceof Error ? err.message : String(err);
        log.error('发生错误：', errorMsg);
        log.line();
    }
    log.info('程序已结束，将在 5 秒后退出');
    Deno.exit();
}

function clean(): void {
    for (const notification of notifications) {
        notification.die();
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
}

function sendMsg(msg: string) {
    for (const notification of notifications) {
        notification
            .send({
                title: '[CRTicketMonitor]',
                time: time(),
                content: msg,
            })
            .catch((err) => {
                log.error(`${notification.info.name} (${notification.info.description}) 发送失败：${err.message}`);
            });
    }
}

async function searchTickets(search: SearchConfig): Promise<void> {
    log.info(`查询 ${search.date} ${search.from}→${search.to} 车票：`);
    const data = await ChinaRailway.checkTickets(search.date, await ChinaRailway.getStationCode(search.from), await ChinaRailway.getStationCode(search.to));
    for (const row of data.data.result) {
        const trainInfo = ChinaRailway.parseTrainInfo(row);
        if (!search.trains) {
            await determineRemainTickets(trainInfo);
        } else {
            for (const train of search.trains) {
                if (
                    train.code == trainInfo.station_train_code &&
                    (train.from === undefined || train.from == ChinaRailway.stationName[trainInfo.from_station_telecode]) &&
                    (train.to === undefined || train.to == ChinaRailway.stationName[trainInfo.to_station_telecode])
                ) {
                    await determineRemainTickets(trainInfo, train.seatCategory, train.checkRoundTrip ?? false);
                }
            }
        }
    }
}

async function determineRemainTickets(trainInfo: TrainInfo, seatCategory?: SeatCategory[], checkRoundTrip = false): Promise<void> {
    const trainDescription =
        trainInfo.station_train_code +
        ' ' +
        (await ChinaRailway.getStationName(trainInfo.from_station_telecode)) +
        '→' +
        (await ChinaRailway.getStationName(trainInfo.to_station_telecode));
    let { remain, msg } = await checkRemainTickets(trainInfo, seatCategory, checkRoundTrip);
    if (!remain && seatCategory !== undefined) {
        msg = seatCategory.join('/') + ' ' + msg;
    }
    log.info('-', trainDescription, msg);
    if (remain) {
        sendMsg(trainDescription + '\n' + msg);
    }
}

async function checkRemainTickets(trainInfo: TrainInfo, seatCategory?: SeatCategory[], checkRoundTrip?: boolean): Promise<TicketCheckResult> {
    const remainTypes: string[] = [];
    let remainTotal = 0;
    for (const type of Object.keys(trainInfo.tickets)) {
        if (seatCategory !== undefined && !seatCategory.includes(type as SeatCategory)) {
            continue;
        }
        const ticketValue = trainInfo.tickets[type as SeatCategory];
        if (ticketValue && ticketValue !== '' && ticketValue !== '无') {
            remainTypes.push(type + ' ' + ticketValue);
            if (ticketValue === '有') {
                remainTotal += Infinity;
            } else {
                remainTotal += parseInt(ticketValue);
            }
        }
    }
    if (remainTypes.length) {
        return {
            remain: true,
            total: remainTotal >= 20 ? '≥20' : remainTotal,
            msg: remainTypes.join(' / '),
        };
    }
    if (!checkRoundTrip) {
        return {
            remain: false,
            msg: '区间无票',
        };
    }
    const roundTripData = await ChinaRailway.checkTickets(
        trainInfo.start_train_date,
        trainInfo.start_station_telecode,
        trainInfo.end_station_telecode,
        sleep((config.delay ?? 5) * 1000)
    );
    for (const row of roundTripData.data.result) {
        const roundTripInfo = ChinaRailway.parseTrainInfo(row);
        if (
            trainInfo.train_no == roundTripInfo.train_no &&
            trainInfo.start_station_telecode == roundTripInfo.from_station_telecode &&
            trainInfo.end_station_telecode == roundTripInfo.to_station_telecode
        ) {
            const { remain: roundTripRemain, total: roundTripRemainTotal }: TicketCheckResult = await checkRemainTickets(roundTripInfo, seatCategory, false);
            return {
                remain: false,
                msg: `区间无票，全程${roundTripRemain ? `有票 (${roundTripRemainTotal}张)` : '无票'}`,
            };
        }
    }
    return {
        remain: false,
        msg: '区间无票，全程未知',
    };
}

async function update(): Promise<void> {
    log.info('开始查询余票');
    try {
        for (const search of config.watch) {
            await searchTickets(search);
            await sleep((config.delay ?? 5) * 1000);
        }
        ChinaRailway.clearTicketCache();
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        log.error(errorMsg);
        sendMsg('错误：' + errorMsg);
    }
    log.info('余票查询完成');
    log.line();
}

async function checkConfig(): Promise<void> {
    try {
        const configText = Deno.readTextFileSync('config.json');
        config = JSON.parse(configText) as Config;
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            log.error('config.json 不存在');
            try {
                Deno.writeTextFileSync('config.json', await asset('config.example.json'));
                log.info('已自动创建 config.json');
                log.info('请根据需要修改后重启程序');
            } catch (_err) {
                log.error('创建 config.json 失败');
                log.info('请自行创建后重启程序');
            }
        } else {
            log.error('读取 config.json 时发生错误：', err);
        }
        die();
    }

    let configParsing = '当前配置文件：\n\n';
    if (!config.watch || !config.watch.length) {
        log.error('未配置搜索条件');
        die();
    }
    for (const search of config.watch) {
        if (!search.date || !search.from || !search.to) {
            log.error('搜索条件不完整');
            die();
        }
        configParsing += search.date + ' ' + search.from + '→' + search.to + '\n';
        if (search.trains && search.trains.length) {
            for (const train of search.trains) {
                if (!train.code) {
                    log.error('未填写车次号');
                    die();
                }
                configParsing +=
                    '- ' +
                    train.code +
                    ' ' +
                    (train.from ?? '(*)') +
                    '→' +
                    (train.to ?? '(*)') +
                    ' ' +
                    (train.seatCategory ? train.seatCategory.join('/') : '全部席别') +
                    ' ' +
                    (train.checkRoundTrip ? '[✓]' : '[×]') +
                    '查询全程票\n';
            }
        } else {
            configParsing += '- 全部车次\n';
        }
        configParsing += '\n';
    }

    for (const notification of config.notifications) {
        try {
            if (!notification.type) {
                throw new Error('未指定推送类型');
            }

            const NotificationClass = Notifications[notification.type];
            if (!NotificationClass) {
                const availableTypes = Object.keys(Notifications).join(', ');
                throw new Error(`不支持的推送类型："${notification.type}"，支持的类型有：${availableTypes}`);
            }

            const n = new (NotificationClass as new (config: unknown) => NotificationBase)(notification);

            notifications.push(n);
            configParsing += `已配置消息推送：${n.info.name} (${n.info.description})` + '\n';
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            log.error('配置消息推送时发生错误：', errorMsg);
        }
    }
    if (!notifications.length) {
        log.warn('未配置消息推送');
        configParsing += '未配置消息推送\n';
    }
    configParsing += '\n';

    if (!config.interval) config.interval = 15;
    if (!config.delay) config.delay = 5;
    configParsing += `查询间隔：${config.interval}分钟，访问延迟：${config.delay}秒`;

    log.line();
    log.direct(configParsing);
    log.line();

    sendMsg(configParsing);
    log.info('已尝试发送提醒，如未收到请检查配置');
}

globalThis.addEventListener('unload', clean);
globalThis.addEventListener('beforeunload', clean);
Deno.addSignalListener('SIGINT', () => die('SIGINT'));
globalThis.addEventListener('error', (event) => {
    die(event.error);
});
globalThis.addEventListener('unhandledrejection', (event) => {
    die(event.reason);
});

async function main(): Promise<void> {
    console.clear();
    log.title(String.raw`
               __________  ________  ___
              / ____/ __ \/_  __/  |/  /
             / /   / /_/ / / / / /|_/ /
            / /___/ _  _/ / / / /  / /
            \____/_/ |_| /_/ /_/  /_/

    `);
    log.title('本程序为开源程序，仓库地址：');
    log.title('https://github.com/BobLiu0518/CRTicketMonitor');
    log.line();

    await checkConfig();
    log.info('5秒后开始首次查询，按 Ctrl+C 中止');
    setInterval(update, (config.interval ?? 15) * 60 * 1000);
    setTimeout(update, 5 * 1000);
}

main().catch((err) => {
    die(err);
});
