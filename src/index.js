import fs from 'fs';
import ChinaRailway from './cr.js';
import Notifications from './notifications.js';
import { sleep, time, log } from './utils.js';

let config;
let notifications = [];

function die(err) {
    if (err && err != 'SIGINT') {
        log.error('发生错误：', err);
        log.line();
    }
    log.info('程序已结束，将在 5 秒后退出');
    process.exit();
}

function clean() {
    for (let notification of notifications) {
        notification.die();
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
}

async function sendMsg(msg) {
    for (let notification of notifications) {
        notification
            .send({
                title: '[CRTicketMonitor]',
                time: time(),
                content: msg,
            })
            .catch((err) => {
                log.error(
                    `${notification.info.name} (${notification.info.description}) 发送失败：${err}`
                );
            });
    }
}

async function searchTickets(search) {
    log.info(`查询 ${search.date} ${search.from}→${search.to} 车票：`);
    let data = await ChinaRailway.checkTickets(
        search.date,
        await ChinaRailway.getStationCode(search.from),
        await ChinaRailway.getStationCode(search.to)
    );
    for (let row of data.data.result) {
        let trainInfo = ChinaRailway.parseTrainInfo(row);
        if (!search.trains) {
            await determineRemainTickets(trainInfo);
        } else {
            for (let train of search.trains) {
                if (
                    train.code == trainInfo.station_train_code &&
                    (train.from === undefined ||
                        train.from ==
                            ChinaRailway.stationName[
                                trainInfo.from_station_telecode
                            ]) &&
                    (train.to === undefined ||
                        train.to ==
                            ChinaRailway.stationName[
                                trainInfo.to_station_telecode
                            ])
                ) {
                    await determineRemainTickets(
                        trainInfo,
                        train.seatCategory,
                        train.checkRoundTrip ?? false
                    );
                }
            }
        }
    }
}

async function determineRemainTickets(
    trainInfo,
    seatCategory = undefined,
    checkRoundTrip = false
) {
    let trainDescription =
        trainInfo.station_train_code +
        ' ' +
        (await ChinaRailway.getStationName(trainInfo.from_station_telecode)) +
        '→' +
        (await ChinaRailway.getStationName(trainInfo.to_station_telecode));
    let { remain, msg } = await checkRemainTickets(
        trainInfo,
        seatCategory,
        checkRoundTrip
    );
    if (!remain && seatCategory !== undefined) {
        msg = seatCategory.join('/') + ' ' + msg;
    }
    log.info('-', trainDescription, msg);
    if (remain) {
        sendMsg(trainDescription + '\n' + msg);
    }
}

async function checkRemainTickets(trainInfo, seatCategory, checkRoundTrip) {
    let remainTypes = [];
    let remainTotal = 0;
    for (let type of Object.keys(trainInfo.tickets)) {
        if (seatCategory !== undefined && !seatCategory.includes(type)) {
            continue;
        }
        if (trainInfo.tickets[type] != '' && trainInfo.tickets[type] != '无') {
            remainTypes.push(type + ' ' + trainInfo.tickets[type]);
            if (trainInfo.tickets[type] == '有') {
                remainTotal += Infinity;
            } else {
                remainTotal += parseInt(trainInfo.tickets[type]);
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
    let roundTripData = await ChinaRailway.checkTickets(
        trainInfo.start_train_date,
        trainInfo.start_station_telecode,
        trainInfo.end_station_telecode,
        sleep(config.delay * 1000)
    );
    for (let row of roundTripData.data.result) {
        let roundTripInfo = ChinaRailway.parseTrainInfo(row);
        if (
            trainInfo.station_train_code == roundTripInfo.station_train_code &&
            trainInfo.start_station_telecode ==
                roundTripInfo.from_station_telecode &&
            trainInfo.end_station_telecode == roundTripInfo.to_station_telecode
        ) {
            let { remain: roundTripRemain, total: roundTripRemainTotal } =
                await checkRemainTickets(roundTripInfo, seatCategory, false);
            return {
                remain: false,
                msg: `区间无票，全程${
                    roundTripRemain
                        ? `有票 (${roundTripRemainTotal}张)`
                        : '无票'
                }`,
            };
        }
    }
    return {
        remain: false,
        msg: '区间无票，全程未知',
    };
}

async function update() {
    log.info('开始查询余票');
    try {
        for (let search of config.watch) {
            await searchTickets(search);
            await sleep(config.delay * 1000);
        }
        ChinaRailway.clearTicketCache();
    } catch (e) {
        log.error(e);
        sendMsg('错误：' + e.message);
    }
    log.info('余票查询完成');
    log.line();
}

function checkConfig() {
    try {
        config = fs.readFileSync('config.json', 'UTF-8');
    } catch (err) {
        if (err.code == 'ENOENT') {
            log.error('config.json 不存在');
            try {
                fs.writeFileSync(
                    'config.json',
                    JSON.stringify({ watch: [], notifications: [] })
                );
                log.info('已自动创建 config.json');
                log.info('请根据需要修改后重启程序');
            } catch (err) {
                log.error('创建 config.json 失败');
                log.info('请自行创建后重启程序');
            }
        } else {
            log.error('读取 config.json 时发生错误：', err);
        }
        die();
    }
    try {
        config = JSON.parse(config);
    } catch (err) {
        log.error('解析 config.json 时发生错误：', err);
        die();
    }

    let configParsing = '当前配置文件：\n\n';
    if (!config.watch || !config.watch.length) {
        log.error('未配置搜索条件');
        die();
    }
    for (let search of config.watch) {
        if (!search.date || !search.from || !search.to) {
            log.error('搜索条件不完整');
            die();
        }
        configParsing +=
            search.date + ' ' + search.from + '→' + search.to + '\n';
        if (search.trains && search.trains.length) {
            for (let train of search.trains) {
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
                    (train.seatCategory
                        ? train.seatCategory.join('/')
                        : '全部席别') +
                    ' ' +
                    (train.checkRoundTrip ? '[✓]' : '[×]') +
                    '查询全程票\n';
            }
        } else {
            configParsing += '- 全部车次\n';
        }
        configParsing += '\n';
    }

    for (let notification of config.notifications) {
        try {
            let n = new Notifications[notification.type](notification);
            notifications.push(n);
            configParsing +=
                `已配置消息推送：${n.info.name} (${n.info.description})` + '\n';
        } catch (e) {
            log.error('配置消息推送时发生错误：', e);
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

    sendMsg(configParsing).then(() => {
        log.info('已尝试发送提醒，如未收到请检查配置');
    });
}

process.title = 'CR Ticket Monitor';
process.on('uncaughtException', die);
process.on('unhandledRejection', die);
process.on('SIGINT', die);
process.on('exit', clean);

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

checkConfig();
setInterval(update, config.interval * 60 * 1000);
update();
