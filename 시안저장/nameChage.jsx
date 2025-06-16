(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
  var count = 0;

  for (var i = 0; i < doc.variables.length; i++) {
    var variable = doc.variables[i];

    // 변수명이 "이름"으로 시작하는지 확인
    if (variable.name.indexOf("이름") === 0) {
      // 연결된 오브젝트 가져오기
      try {
        var destObj = variable.pageItems[0]; // 텍스트 프레임 등 연결된 항목
        if (destObj && destObj.contents !== undefined) {
          destObj.contents = "홍길동";
          count++;
        }
      } catch (e) {
        // 연결 안 되어 있으면 무시
        continue;
      }
    }
  }

})();
