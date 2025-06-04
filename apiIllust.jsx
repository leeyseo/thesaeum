(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // ───────────── 정보 수집 ─────────────
  var fileName = doc.name;
  var layerCount = doc.layers.length;
  var artboardCount = doc.artboards.length;

  // ───────────── 데이터셋 수 확인 ─────────────
  var datasetCount = 0;
  try {
    if (doc.variables.length > 0) {
      datasetCount = doc.dataSets.length;
    }
  } catch (e) {
    datasetCount = 0;
  }

  // ───────────── JSON.stringify 대체 ─────────────
  function toJSON(obj) {
    var s = [];
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      var val = obj[key];
      var valStr = (typeof val === "string") ? ('"' + val + '"') : val;
      s.push('"' + key + '":' + valStr);
    }
    return '{' + s.join(",") + '}';
  }

  var payload = {
    filename: fileName,
    layers: layerCount,
    artboards: artboardCount,
    datasets: datasetCount
  };

  var jsonStr = toJSON(payload);

  // ───────────── 임시 파일 저장 ─────────────
  var tempFile = new File(Folder.temp + "/ai_payload.json");
  tempFile.encoding = "UTF-8";
  tempFile.open("w");
  tempFile.write(jsonStr);
  tempFile.close();

  // ───────────── curl 명령어 ─────────────
  var endpoint = "http://localhost:3000/receive-info";
  var curlCmd = 'curl -s -X POST -H "Content-Type: application/json" -d @\"' +
                tempFile.fsName + '\" ' + endpoint;

  // ───────────── 시스템 명령 실행 ─────────────
  try {
    var result = $.callSystem(curlCmd);  // ← 여기만 수정됨!
    alert("서버 응답:\n" + result);
  } catch (err) {
    alert("API 호출 중 오류 발생:\n" + err.message);
  }
})();
