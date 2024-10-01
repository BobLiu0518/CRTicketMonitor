import fs from 'fs';
import { exit } from 'process';
import ChinaRailway from './cr.js';
import Notifications from './notifications.js';
import { sleep, time, log } from './utils.js';

let config = JSON.parse(fs.readFileSync('config.json', 'UTF-8') ?? '{}');
let { stationCode, stationName } = await ChinaRailway.getStationData();
let notifications = [];

async function sendMsg(msg) {
    msg = '[CRTicketMonitor]\n' + time() + '\n' + msg;
    for (let notification of notifications) {
        notification.send(msg).catch((err) => {
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
        stationCode[search.from],
        stationCode[search.to]
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
                            stationName[trainInfo.from_station_telecode]) &&
                    (train.to === undefined ||
                        train.to == stationName[trainInfo.to_station_telecode])
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
        stationName[trainInfo.from_station_telecode] +
        '→' +
        stationName[trainInfo.to_station_telecode];
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
    for (let type of Object.keys(trainInfo.tickets)) {
        if (seatCategory !== undefined && !seatCategory.includes(type)) {
            continue;
        }
        if (trainInfo.tickets[type] != '' && trainInfo.tickets[type] != '无') {
            remainTypes.push(type + ' ' + trainInfo.tickets[type]);
        }
    }
    if (remainTypes.length) {
        return {
            remain: true,
            msg: remainTypes.join(' / '),
        };
    }
    if (!checkRoundTrip) {
        return {
            remain: false,
            msg: '区间无票',
        };
    }
    await sleep(config.delay * 1000);
    let roundTripData = await ChinaRailway.checkTickets(
        trainInfo.start_train_date,
        trainInfo.start_station_telecode,
        trainInfo.end_station_telecode
    );
    for (let row of roundTripData.data.result) {
        let roundTripInfo = ChinaRailway.parseTrainInfo(row);
        if (
            trainInfo.station_train_code == roundTripInfo.station_train_code &&
            trainInfo.start_station_telecode ==
                roundTripInfo.from_station_telecode &&
            trainInfo.end_station_telecode == roundTripInfo.to_station_telecode
        ) {
            let { remain: roundTripRemain } = await checkRemainTickets(
                roundTripInfo,
                seatCategory,
                false
            );
            return {
                remain: false,
                msg: `区间无票，全程${roundTripRemain ? '有' : '无'}票`,
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
    } catch (e) {
        log.error(e);
        sendMsg('错误：' + e.message);
    }
    log.info('余票查询完成');
    log.line();
}

function checkConfig() {
    log.info('当前配置文件：');
    log.line();
    if (!config.watch || !config.watch.length) {
        log.error('未配置搜索条件');
        exit();
    }
    for (let search of config.watch) {
        if (!search.date || !search.from || !search.to) {
            log.error('搜索条件不完整');
            exit();
        }
        log.direct(search.date, search.from + '→' + search.to);
        if (search.trains.length) {
            for (let train of search.trains) {
                if (!train.code) {
                    log.error('未填写车次号');
                    exit();
                }
                log.direct(
                    '-',
                    train.code,
                    (train.from ?? '(*)') + '→' + (train.to ?? '(*)'),
                    train.seatCategory
                        ? train.seatCategory.join('/')
                        : '全部席别',
                    (train.checkRoundTrip ? '[✓]' : '[×]') + '查询全程票'
                );
            }
        } else {
            log.direct('-', '全部车次');
        }
        log.line();
    }

    for (let notification of config.notifications) {
        let n = new Notifications[notification.type](notification);
        notifications.push(n);
        log.direct(`已配置消息推送：${n.info.name} (${n.info.description})`);
    }
    if (!notifications.length) {
        log.warn('未配置消息推送');
    }
    log.line();

    if (!config.interval) config.interval = 15;
    if (!config.delay) config.delay = 5;
    log.direct(`查询间隔：${config.interval}分钟，访问延迟：${config.delay}秒`);
    log.line();
}

console.clear();
setInterval(update, config.interval * 60 * 1000);
checkConfig();
await sendMsg('12306 余票监控已启动');
log.info('已发送测试提醒，如未收到请检查配置');
update();
