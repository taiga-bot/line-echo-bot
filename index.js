'use strict';
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();
const currentUsers = {}; // ユーザーID → 名前 保存

app.post('/callback', line.middleware(config), async (req, res) => {
  const client = new line.Client(config);

  await Promise.all(req.body.events.map(async (event) => {
    if (event.type !== 'message' || event.message.type !== 'text') return;

    const msg = event.message.text;
    const userId = event.source.userId;

    // ステップ①：「シフト入力」で名前選択ボタンを送信
    if (msg === 'シフト入力') {
      const names = ['辰廣大河', '山内ゆうき', '佐藤まい'];
      const buttons = names.map(name => ({
        type: 'button',
        action: {
          type: 'message',
          label: name,
          text: `名前:${name}`
        }
      }));

      const flexMessage = {
        type: 'flex',
        altText: '従業員を選んでください',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: buttons
          }
        }
      };

      return client.replyMessage(event.replyToken, flexMessage);
    }

    // ステップ②：名前を選んだら保存し、日付と時間入力を促す
    if (msg.startsWith('名前:')) {
      const name = msg.replace('名前:', '');
      currentUsers[userId] = { name };
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `${name} さん、日付と時間を入力してください（例：7/15 9:00-13:00）`
      });
    }

    // ステップ③：日付と時間を受け取ってGASに送信
    const timeMatch = msg.match(/^(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (timeMatch) {
      const [, date, start, end] = timeMatch;
      const name = currentUsers[userId]?.name;

      if (!name) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '⚠️ 先に「シフト入力」から名前を選んでください。'
        });
      }

      await axios.post('https://script.google.com/macros/s/AKfycbyOGeC92p1zzV7Au5p04Z1Eo9YqL6IhY4NIEnYpyvvKf31w-vY0fbnZ3So5pNQz_eSR/exec', {
        name, date, start, end
      });

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ ${date} のシフト希望を登録しました！（${name}）`
      });
    }

    // その他のメッセージ：エラー表示
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 入力形式が正しくありません。\n「シフト入力」から始めてください。'
    });
  }));

  res.status(200).end();
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
