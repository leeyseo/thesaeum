(function () {
  // 문서 열려 있는지 확인
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // 1) '이름'으로 시작하는 변수 리스트 수집
  var nameVars = [];
  for (var i = 0; i < doc.variables.length; i++) {
    var v = doc.variables[i];
    if (v.kind === VariableKind.TEXTUAL && v.name.indexOf("이름") === 0) {
      nameVars.push(v);
    }
  }
  if (nameVars.length === 0) {
    alert("'이름'으로 시작하는 텍스트 변수(Variables)가 없습니다.");
    return;
  }

  // 2) 매핑된 텍스트 프레임 찾아 변수 연결 해제 후 '홍길동'으로 변경
  var changed = 0;
  for (var j = 0; j < doc.textFrames.length; j++) {
    var tf = doc.textFrames[j];
    if (!tf.variable) continue;          // 변수 미연결 프레임 건너뜀

    for (var k = 0; k < nameVars.length; k++) {
      if (tf.variable === nameVars[k]) {
        tf.variable = null;             // 연결 해제
        tf.contents = "홍길동";         // 내용 덮어쓰기
        changed++;
        break;
      }
    }
  }

  alert("홍길동으로 변경된 텍스트 프레임 수: " + changed);
})();
