(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // 문서 저장 필수
  if (!doc.saved) {
    try { doc.save(); }
    catch (e) {
      alert("문서를 저장할 수 없습니다: " + e.message);
      return;
    }
  }

  // CSV 선택
  var csvFile = File.openDialog("CSV 파일을 선택하세요");
  if (!csvFile || !csvFile.open("r")) {
    alert("CSV 파일을 열 수 없거나 선택되지 않았습니다.");
    return;
  }

  // ① 헤더 읽기
  var headerLine = csvFile.readln();
  var headers = headerLine.split(",");

  // ② 변수 이름 → 객체 매핑
  var varMap = {};
  for (var v = 0; v < doc.variables.length; v++) {
    var varObj = doc.variables[v];
    varMap[varObj.name] = varObj;
  }

  // ③ 모든 변수 존재 확인
  for (var i = 0; i < headers.length; i++) {
    var name = headers[i];
    if (!(name in varMap)) {
      alert("❌ 변수 '" + name + "' 이(가) 존재하지 않습니다.\n먼저 변수부터 생성하세요.");
      return;
    }
  }

  // ④ 본문 → 데이터셋 추가
  var added = 0;
  while (!csvFile.eof) {
    var line = csvFile.readln();
    var values = line.split(",");
    if (values.length !== headers.length) {
      alert("❗ 데이터 행과 헤더 수가 다릅니다 (행 " + (added + 1) + ")");
      return;
    }

    var ds = doc.dataSets.add("행_" + (added + 1));

    for (var c = 0; c < headers.length; c++) {
      var varName = headers[c];
      var value = values[c];
      ds.setVariableValue(varMap[varName], value);
    }

    added++;
  }

  csvFile.close();
  alert("✅ 데이터셋 " + added + "개 추가 완료!\nVariables 패널에서 확인해보세요.");
})();
