export type SeatCategory =
    | '高级软卧'
    | '软卧'
    | '硬卧'
    | '商务座'
    | '特等座'
    | '优选一等座'
    | '一等座'
    | '二等座'
    | '软座'
    | '硬座'
    | '无座'
    | '其他'
    | 'YB'
    | 'SRRB';

export interface TrainConfig {
    code: string;
    from?: string;
    to?: string;
    seatCategory?: SeatCategory[];
    checkRoundTrip?: boolean;
}

export interface SearchConfig {
    from: string;
    to: string;
    date: string;
    trains?: TrainConfig[];
}

export interface BrowserNotificationConfig {
    type: 'Browser';
    host?: string;
    port: number;
}

export interface WecomChanNotificationConfig {
    type: 'WecomChan';
    agentId: string;
    secret: string;
    companyId: string;
    toUid: string;
}

export interface HTTPNotificationConfig {
    type: 'HTTP';
    url: string;
}

export type NotificationConfig = BrowserNotificationConfig | WecomChanNotificationConfig | HTTPNotificationConfig;

export interface Config {
    $schema?: string;
    watch: SearchConfig[];
    notifications: NotificationConfig[];
    interval?: number;
    delay?: number;
}

export interface Message {
    title: string;
    time: string;
    content: string;
}

export interface NotificationInfo {
    name: string;
    description: string;
}

export type TicketInfo = {
    [K in SeatCategory]?: string;
};

export interface TrainInfo {
    secretStr: string;
    buttonTextInfo: string;
    train_no: string;
    station_train_code: string;
    start_station_telecode: string;
    end_station_telecode: string;
    from_station_telecode: string;
    to_station_telecode: string;
    start_time: string;
    arrive_time: string;
    lishi: string;
    canWebBuy: string;
    yp_info: string;
    start_train_date: string;
    train_seat_feature: string;
    location_code: string;
    from_station_no: string;
    to_station_no: string;
    is_support_card: string;
    controlled_train_flag: string;
    gg_num: string;
    gr_num: string;
    qt_num: string;
    rw_num: string;
    rz_num: string;
    tz_num: string;
    wz_num: string;
    yb_num: string;
    yw_num: string;
    yz_num: string;
    ze_num: string;
    zy_num: string;
    swz_num: string;
    srrb_num: string;
    yp_ex: string;
    seat_types: string;
    exchange_train_flag: string;
    houbu_train_flag: string;
    houbu_seat_limit: string;
    yp_info_new: string;
    dw_flag: string;
    stopcheckTime: string;
    country_flag: string;
    local_arrive_time: string;
    local_start_time: string;
    bed_level_info: string;
    seat_discount_info: string;
    sale_time: string;
    tickets: TicketInfo;
}

export interface TicketApiResponse {
    status: boolean;
    data: {
        result: string[];
    };
}

export interface TicketCheckResult {
    remain: boolean;
    total?: string | number;
    msg: string;
}

export interface WecomAccessToken {
    token: string | null;
    expire: number | null;
}

export interface WebSocketMessage {
    type: 'history' | 'notice' | 'die';
    content?: Message | Message[] | unknown;
}
