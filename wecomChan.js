export async function sendToWecom(body) {
    body.wecomTouid = body.wecomTouid ?? '@all';
    const getTokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${body.wecomCId}&corpsecret=${body.wecomSecret}`;
    const getTokenRes = await fetch(getTokenUrl);
    const accessToken = (await getTokenRes.json()).access_token;
    if (accessToken?.length <= 0) {
        throw new Error('获取 accessToken 失败');
    }
    const sendMsgUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`;
    const sendMsgRes = await fetch(sendMsgUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            touser: body.wecomTouid,
            agentid: body.wecomAgentId,
            msgtype: 'text',
            text: {
                content: body.text,
            },
            duplicate_check_interval: 600,
        }),
    });
    return await sendMsgRes.json();
}
