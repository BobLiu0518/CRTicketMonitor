# China Railway Ticket Monitor

12306 余票监控程序

## 使用方法

### 安装 Node.js

前往 [Node.js 官网](https://nodejs.org/zh-cn) 安装

### 安装依赖

```bash
$ npm i
```

### 配置 Wecom

本程序使用 [Wecom 酱](https://github.com/easychen/wecomchan) 进行消息通知，配置方法详见 [企业微信应用消息配置](https://github.com/easychen/wecomchan/blob/main/README.md#%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E5%BA%94%E7%94%A8%E6%B6%88%E6%81%AF%E9%85%8D%E7%BD%AE%E8%AF%B4%E6%98%8E)。

当然，你也可以自行选用其他的通知方式，编辑 `index.js` 中的 `sendMsg` 函数即可。

### 配置 config.json

在配置前，先将仓库中的 `config.json.example` 重命名为 `config.json`，然后进行修改。

需要注意，`JSON`文件不允许出现注释，如果使用下面的模板，请删除所有 `//` 开头的内容。

```json
{
    // 查询列表
    "watch": [
        // 可添加多个查询
        {
            // 基础信息
            "from": "上海", // 起点站（包含同城站）
            "to": "北京", // 终点站（包含同城站）
            "date": "20241001", // 日期（YYYYMMDD）

            // 车次列表（选填），不填时默认为全部车次
            "trains": [
                {
                    "code": "G2", // 车次号
                    "from": "上海", // 指定起点站（选填）
                    "to": "北京南", // 指定终点站（选填）
                    "seatCategory": ["二等座"], // 限定席别（选填，详见下文）
                    "checkRoundTrip": true // 查询全程车票情况（选填）
                }
            ]
        }
    ],

    "notification": {
        // Wecom 酱配置
        "wecomChan": {
            // 应用 ID
            "agentId": "",
            // 应用 Secret
            "secret": "",
            // 企业 ID
            "companyId": ""
        },
    }

    // 刷新间隔（分钟）
    "interval": 15
}
```

### 席别设置

可选的席别如下：

-   卧铺：
    -   `高级软卧`
    -   `软卧`（含动卧一等卧）
    -   `硬卧`（含二等卧）
-   坐票：
    -   `商务座`
    -   `特等座`
    -   `优选一等座`
    -   `一等座`
    -   `二等座`
    -   `软座`
    -   `硬座`
    -   `无座`
-   其他：
    -   `其他`（含包厢硬卧等）
    -   `YB`（未知类型）
    -   `SRRB`（未知类型）

### 运行

本项目针对 `Linux` 服务器进行开发，安装 `screen` 后，运行 `./run.sh` 即可启动。

如果使用其他系统，可以在命令行中输入 `npm start` 运行。
