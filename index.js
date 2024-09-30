import fs from 'fs';
import ChinaRailway from './cr.js';
import { sleep, time, log } from './utils.js';
import { sendToWecom } from './serverChan.js';

let config = JSON.parse(fs.readFileSync('config.json', 'UTF-8') ?? '{}');
let { stationCode, stationName } = ChinaRailway.getStationData();

function sendMsg(msg) {
    msg = '[CRTicketMonitor]\n' + time() + '\n' + msg;
    if (config.notification.wecomChan !== undefined) {
        try {
            sendToWecom({
                text: msg,
                wecomAgentId: config.notification.wecomChan.agentId,
                wecomSecret: config.notification.wecomChan.secret,
                wecomCId: config.notification.wecomChan.companyId,
                wecomTouid: config.notification.wecomChan.toUid,
            });
        } catch (e) {
            log.error('发送 WeCom 提醒失败：', e);
        }
    }
}

function searchTickets(search) {
    log.info('查询', search.date, search.from + '→' + search.to, '车票：');
    let data = ChinaRailway.checkTickets(
        search.date,
        stationCode[search.from],
        stationCode[search.to]
    );
    data.data.result.forEach((row) => {
        let trainInfo = ChinaRailway.parseTrainInfo(row);
        if (!search.trains) {
            determineRemainTickets(trainInfo);
        } else {
            search.trains.forEach((train) => {
                if (
                    train.code == trainInfo.station_train_code &&
                    (train.from === undefined ||
                        train.from ==
                            stationName[trainInfo.from_station_telecode]) &&
                    (train.to === undefined ||
                        train.to == stationName[trainInfo.to_station_telecode])
                ) {
                    determineRemainTickets(
                        trainInfo,
                        train.seatCategory,
                        train.checkRoundTrip ?? false
                    );
                }
            });
        }
    });
}

function determineRemainTickets(
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
    let { remain, msg } = checkRemainTickets(
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

function checkRemainTickets(trainInfo, seatCategory, checkRoundTrip) {
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
    sleep(config.delay * 1000);
    let roundTripData = ChinaRailway.checkTickets(
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
            let { remain: roundTripRemain } = checkRemainTickets(
                roundTripInfo,
                seatCategory,
                false
            );
            return {
                remain: false,
                msg: '区间无票，全程' + (roundTripRemain ? '有票' : '无票'),
            };
        }
    }
    return {
        remain: false,
        msg: '区间无票，全程未知',
    };
}

function update() {
    log.info('开始查询余票');
    try {
        config.watch.forEach((search) => {
            searchTickets(search);
            sleep(config.delay * 1000);
        });
    } catch (e) {
        log.error(e);
        sendMsg('错误：' + e.message);
    }
    log.info('余票查询结束');
    log.line();
}

function displayConfig() {
    log.info('当前配置文件：');
    log.line();
    config.watch.forEach((search) => {
        log.direct(search.date, search.from + '→' + search.to);
        if (search.trains.length) {
            search.trains.forEach((train) => {
                log.direct(
                    '-',
                    train.code,
                    (train.from ?? '(*)') + '→' + (train.to ?? '(*)'),
                    train.seatCategory
                        ? train.seatCategory.join('/')
                        : '全部席别',
                    (train.checkRoundTrip ? '[✓]' : '[×]') + '查询全程票'
                );
            });
        } else {
            log.direct('-', '全部车次');
        }
        log.line();
    });
}

console.clear();
sendMsg('12306 余票监控已启动');
log.info('已发送测试提醒，如未收到请检查配置');
setInterval(update, config.interval * 60 * 1000);
displayConfig();
update();
