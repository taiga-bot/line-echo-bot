'use strict';

const express = require('express');
const line = require('@line/bot-sdk');


// 🔽 この行を追加！
console.log('DEBUG - CHANNEL_SECRET:', process.env.CHANNEL_SECRET);

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();
app.use(express.json()); // ★これ絶対必要！

app.post('/callback', line.middleware(config), (req, res) => {
  const events = req.body.events;
  const client = new line.Client(config);

  Promise
    .all(events.map(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: event.message.text
        });
      } else {
        return Promise.resolve(null); // その他イベントは無視して成功扱い
      }
    }))
    .then(() => res.status(200).end()) // ★ ちゃんと 200 を返す！
    .catch(err => {
      console.error('Callback error:', err); // ログ残す
      res.status(200).end(); // ★ 失敗でも200返してLINEが切らないように
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
