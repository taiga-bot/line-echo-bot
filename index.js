'use strict';
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const app = express();
const PAGE_SIZE = 10;
const currentUsers = {}; // ユーザーID → 名前 保存

app.post('/callback', line.middleware(config), async (req, res) => {
  const client = new line.Client(config);

  await Promise.all(req.body.events.map(async (event) => {
    if (event.type !== 'message' || event.message.type !== 'text') return;

    const msg = event.message.text;
    const userId = event.source.userId;

// ステップ①：「シフト入力」で名前選択ボタンを送信
if (msg === 'シフト入力') {
  try {
    // ✅ スプレッドシート（GAS）から名前一覧を取得
    const response = await axios.get('https://script.google.com/macros/s/AKfycbxxiYFTn93iTPZMGj56VYOejs1pxGnrjZlgwafh28-4XHKZ40683e-fV3_3o0ifq4vz/exec');
    const names = response.data.names;
    console.log('▶ response.data:', response.data); 

    currentUsers[userId] = { names, page: 1 };

    const sliced = names.slice(0, PAGE_SIZE);
    return client.replyMessage(event.replyToken, createFlexMessage(sliced, 1, names.length));
  } catch (error) {
    console.error('🚨 名前一覧取得エラー:', error.response?.data || error.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 名前一覧の取得に失敗しました。'
    });
  }
}
    
    // ✅ 「次へ N」→ 次ページを表示
    if (msg.startsWith('次へ ')) {
      const page = parseInt(msg.replace('次へ ', ''), 10);
      const names = currentUsers[userId]?.names || [];
      const start = (page - 1) * PAGE_SIZE;
      const sliced = names.slice(start, start + PAGE_SIZE);

      currentUsers[userId].page = page;
      return client.replyMessage(event.replyToken, createFlexMessage(sliced, page, names.length));
    }

    // ✅ 名前を選択 → セッション保存
    if (msg.startsWith('名前:')) {
      const name = msg.replace('名前:', '');
      currentUsers[userId] = { ...currentUsers[userId], name };
      return client.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `${name} さん、希望のシフトを入力してください！\n📋 コピペで複数行まとめて送信もOKです`
        },
        {
          type: 'text',
          text: `例：\n7/15 9:00-13:00\n7/16 10:00-14:00\n7/18 17:00-21:00`
        }
      ]);
    }
  
 // ステップ③：複数行のシフト日程を処理
const lines = msg.split('\n').filter(line => line.trim());
const isAllShifts = lines.every(line => /^(\d{1,2}\/\d{1,2})\s*([0-9]{1,2}:[0-9]{2})-([0-9]{1,2}:[0-9]{2})$/.test(line));

if (isAllShifts && lines.length > 0) {
  const name = currentUsers[userId]?.name;

  if (!name) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 先に「シフト入力」から名前を選んでください。'
    });
  }

  try {
    for (const line of lines) {
      const [, date, start, end] = line.match(/^(\d{1,2}\/\d{1,2})\s*([0-9]{1,2}:[0-9]{2})-([0-9]{1,2}:[0-9]{2})$/);
      await axios.post('https://script.google.com/macros/s/AKfycbxxiYFTn93iTPZMGj56VYOejs1pxGnrjZlgwafh28-4XHKZ40683e-fV3_3o0ifq4vz/exec', {
        name, date, start, end
      });
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `✅ ${lines.length}件のシフト希望を登録しました！（${name}）`
    });
  } catch (error) {
    console.error('🚨 複数登録失敗:', error.response?.data || error.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ シフト登録中にエラーが発生しました。店長に連絡してください。'
    });
  }
}


    // その他のメッセージ：エラー表示
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 入力形式が正しくありません。\n「シフト入力」から始めてください。'
    });
  }));

  res.status(200).end();
});

// ✅ Flexメッセージ生成関数（10件＋次へボタン）
function createFlexMessage(nameList, page, totalCount) {
  const buttons = nameList.map(name => ({
    type: 'button',
    action: {
      type: 'message',
      label: name,
      text: `名前:${name}`
    }
  }));

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (page < totalPages) {
    buttons.push({
      type: 'button',
      action: {
        type: 'message',
        label: `次へ ${page + 1}`,
        text: `次へ ${page + 1}`
      }
    });
  }

  return {
    type: 'flex',
    altText: `名前を選んでください（${page}ページ目）`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: buttons
      }
    }
  };
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
