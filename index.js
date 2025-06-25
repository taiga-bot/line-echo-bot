'use strict';

const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

console.log('DEBUG - CHANNEL_SECRET:', process.env.CHANNEL_SECRET);

const app = express();
app.use(express.json()); // JSONパース

// ★ ミドルウェアなしで検証せずに受け取る！
app.post('/callback', async (req, res) => {
  console.log('DEBUG - Incoming body:', JSON.stringify(req.body)); // ← リクエスト確認

  const client = new line.Client(config);
  const events = req.body.events;

  if (!events || events.length === 0) {
    console.log('No events received');
    return res.status(200).end();
  }

  try {
    await Promise.all(events.map(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: event.message.text
        });
      }
    }));
    res.status(200).end();
  } catch (err) {
    console.error('Callback error:', err);
    res.status(200).end(); // LINEにとって200ならOK
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
