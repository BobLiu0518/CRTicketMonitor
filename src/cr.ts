import { format } from '@std/datetime';
import type { TrainInfo, TicketApiResponse } from './types.ts';

class ChinaRailway {
    static ticketCache: Record<string, TicketApiResponse> = {};
    static stationName: Record<string, string>;
    static stationCode: Record<string, string>;

    static async getStationName(code: string): Promise<string> {
        if (!this.stationName) {
            await this.getStationData();
        }
        return this.stationName[code];
    }

    static async getStationCode(name: string): Promise<string> {
        if (!this.stationCode) {
            await this.getStationData();
        }
        return this.stationCode[name];
    }

    static clearTicketCache(): void {
        this.ticketCache = {};
    }

    static async getStationData(): Promise<void> {
        const response = await fetch('https://kyfw.12306.cn/otn/resources/js/framework/station_name.js');
        const stationText = await response.text();
        const match = stationText.match(/(?<=').+(?=')/);
        if (!match) {
            throw new Error('无法解析车站数据');
        }
        const stationList = match[0].split('@').slice(1);

        this.stationCode = {};
        this.stationName = {};
        stationList.forEach((station) => {
            const details = station.split('|');
            this.stationCode[details[1]] = details[2];
            this.stationName[details[2]] = details[1];
        });
    }

    static async checkTickets(date: string, from: string, to: string, delay?: Promise<void>): Promise<TicketApiResponse> {
        const today = new Date();
        const targetDate = new Date(parseInt(date.substring(0, 4)), parseInt(date.substring(4, 6)) - 1, parseInt(date.substring(6, 8)));
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const targetDateEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
        const maxDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);

        if (todayStart >= targetDateEnd || maxDate < targetDate) {
            throw new Error('日期需为0~15天内');
        }
        if (this.ticketCache[date + from + to]) {
            return this.ticketCache[date + from + to];
        }

        if (delay) {
            await delay;
        }
        const api =
            'https://kyfw.12306.cn/otn/leftTicket/queryG?leftTicketDTO.train_date=' +
            format(targetDate, 'yyyy-MM-dd') +
            '&leftTicketDTO.from_station=' +
            from +
            '&leftTicketDTO.to_station=' +
            to +
            '&purpose_codes=ADULT';
        const res = await fetch(api, {
            headers: {
                Cookie: 'JSESSIONID=',
            },
        });
        const data: TicketApiResponse = await res.json();
        if (!data || !data.status) {
            throw new Error('获取余票数据失败');
        }

        this.ticketCache[date + from + to] = data;
        return data;
    }

    static parseTrainInfo(str: string): TrainInfo {
        // Ref: https://kyfw.12306.cn/otn/resources/merged/queryLeftTicket_end_js.js
        const arr = str.split('|');
        const data = {
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
            tickets: {
                优选一等座: arr[20],
                高级软卧: arr[21],
                其他: arr[22],
                软卧: arr[23],
                软座: arr[24],
                特等座: arr[25],
                无座: arr[26],
                YB: arr[27],
                硬卧: arr[28],
                硬座: arr[29],
                二等座: arr[30],
                一等座: arr[31],
                商务座: arr[32],
                SRRB: arr[33],
            },
        };
        return data as TrainInfo;
    }
}

export default ChinaRailway;
