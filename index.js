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
    await Promise.all(events.map(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: event.message.text
        });
      }
      return Promise.resolve(null);
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
