import fs from 'fs';
import request from 'sync-request';
import moment from 'moment';

class ChinaRailway {
    static getStationData() {
        let stationList = request(
            'GET',
            'https://kyfw.12306.cn/otn/resources/js/framework/station_name.js'
        )
            .getBody('UTF-8')
            .match(/(?<=').+(?=')/)[0]
            .split('@')
            .slice(1);
        let stationCode = {},
            stationName = {};
        stationList.forEach((station) => {
            let details = station.split('|');
            stationCode[details[1]] = details[2];
            stationName[details[2]] = details[1];
        });
        return { stationCode, stationName };
    }

    static parseTrainInfo(str) {
        // Ref: https://kyfw.12306.cn/otn/resources/merged/queryLeftTicket_end_js.js
        let arr = str.split('|');
        let data = {
            secretStr: arr[0],
            buttonTextInfo: arr[1],
            train_no: arr[2],
            station_train_code: arr[3],
            start_station_telecode: arr[4],
            end_station_telecode: arr[5],
            from_station_telecode: arr[6],
            to_station_telecode: arr[7],
            start_time: arr[8],
            arrive_time: arr[9],
            lishi: arr[10],
            canWebBuy: arr[11],
            yp_info: arr[12],
            start_train_date: arr[13],
            train_seat_feature: arr[14],
            location_code: arr[15],
            from_station_no: arr[16],
            to_station_no: arr[17],
            is_support_card: arr[18],
            controlled_train_flag: arr[19],
            gg_num: arr[20],
            gr_num: arr[21],
            qt_num: arr[22],
            rw_num: arr[23],
            rz_num: arr[24],
            tz_num: arr[25],
            wz_num: arr[26],
            yb_num: arr[27],
            yw_num: arr[28],
            yz_num: arr[29],
            ze_num: arr[30],
            zy_num: arr[31],
            swz_num: arr[32],
            srrb_num: arr[33],
            yp_ex: arr[34],
            seat_types: arr[35],
            exchange_train_flag: arr[36],
            houbu_train_flag: arr[37],
            houbu_seat_limit: arr[38],
            yp_info_new: arr[39],
            dw_flag: arr[46],
            stopcheckTime: arr[48],
            country_flag: arr[49],
            local_arrive_time: arr[50],
            local_start_time: arr[51],
            bed_level_info: arr[53],
            seat_discount_info: arr[54],
            sale_time: arr[55],
        };
        data.tickets = {
            优选一等座: data.gg_num,
            高级软卧: data.gr_num,
            其他: data.qt_num,
            软卧: data.rw_num,
            软座: data.rz_num,
            特等座: data.tz_num,
            无座: data.wz_num,
            YB: data.yb_num /* ? */,
            硬卧: data.yw_num,
            硬座: data.yz_num,
            二等座: data.ze_num,
            一等座: data.zy_num,
            商务座: data.swz_num,
            SRRB: data.srrb_num /* ? */,
        };
        return data;
    }

    static checkTickets(date, from, to) {
        let api =
            'https://kyfw.12306.cn/otn/leftTicket/queryG?leftTicketDTO.train_date=' +
            moment(date, 'YYYYMMDD').format('YYYY-MM-DD') +
            '&leftTicketDTO.from_station=' +
            from +
            '&leftTicketDTO.to_station=' +
            to +
            '&purpose_codes=ADULT';
        let res = request('GET', api, {
            headers: {
                Cookie: 'JSESSIONID=',
            },
        });
        let data = JSON.parse(res.getBody('UTF-8'));
        if (!data || !data.status) {
            throw res;
        }
        return data;
    }
}

export default ChinaRailway;
