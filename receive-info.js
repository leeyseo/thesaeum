// receive-info.js
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json()); // JSON 바디 파서

app.post('/receive-info', (req, res) => {
  console.log('✅ POST 요청 도착!');
  console.log(req.body);  // Illustrator에서 보낸 데이터 출력

  res.json({
    status: 'success',
    received: req.body
  });
});

app.get('/receive-info', (req, res) => {
  res.send("이 서버는 POST 전용입니다. Illustrator에서 연결하세요.");
});

app.listen(port, () => {
  console.log(`🚀 서버 실행됨: http://localhost:${port}/receive-info`);
});


