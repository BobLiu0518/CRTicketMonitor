import request from 'superagent';

export async function sendToWecom(body) {
    body.wecomTouid = body.wecomTouid ?? '@all';
    const getTokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${body.wecomCId}&corpsecret=${body.wecomSecret}`;
    const getTokenRes = await request.get(getTokenUrl);
    const accessToken = getTokenRes.body.access_token;
    if (accessToken?.length <= 0) {
        throw new Error('获取 accessToken 失败');
    }
    const sendMsgUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`;
    const sendMsgRes = await request.post(sendMsgUrl).send({
        touser: body.wecomTouid,
        agentid: body.wecomAgentId,
        msgtype: 'text',
        text: {
            content: body.text,
        },
        duplicate_check_interval: 600,
    });
    return sendMsgRes.body;
}
