'use strict';

const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

console.log('DEBUG - CHANNEL_SECRET:', process.env.CHANNEL_SECRET);

const app = express();

// ✅ express.json() は使わない or 使うなら `/callback` 以外で！
app.post('/callback', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const client = new line.Client(config);

  try {
    await Promise.all(events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        const msg = event.message.text;
        const match = msg.match(/^(\S+)\s+(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);

        if (match) {
          const [, name, date, start, end] = match;

          // ✅ GASに送信（GASのWebアプリURLに置き換えてね）
          await axios.post('https://script.google.com/macros/s/あなたのGASのURL/exec', {
            name, date, start, end
          });

          return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `✅ ${date} のシフトを登録しました！`
          });
        }

        // 入力形式が違ったときのメッセージ
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '⚠️ 入力形式が正しくありません。\n例: たいが 7/15 9:00-13:00'
        });
      }

      return Promise.resolve(null); // その他イベントは無視
    }));

    res.status(200).end();
  } catch (err) {
    console.error('Callback error:', err);
    res.status(200).end();
  }
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
