(function () {
  var socket = Socket; // 생성자 아님!

  if (!socket.open("localhost:3000", "binary")) {
    alert("❌ 소켓 열기 실패");
    return;
  }

  // 요청 바디
  var body = '{"filename":"test.ai","layers":5}';
  var req = "";
  req += "POST /receive-info HTTP/1.1\r\n";
  req += "Host: localhost\r\n";
  req += "Content-Type: application/json\r\n";
  req += "Content-Length: " + body.length + "\r\n";
  req += "Connection: close\r\n";
  req += "\r\n";
  req += body;

  socket.write(req);

  // 응답 읽기
  var response = socket.read(999999);
  socket.close();

  alert("✅ 서버 응답:\n" + response);
})();
