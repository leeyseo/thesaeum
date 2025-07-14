(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // 기존 변수 삭제 (선택사항: 주석처리 가능)
  while (doc.variables.length > 0) {
    doc.variables[0].remove();
  }

  // 생성할 변수 이름
  var names = ["이름_1", "직책_1", "영업소_1", "비고_1", "자료a_1"];
  var created = 0;

  for (var i = 0; i < names.length; i++) {
    var v = doc.variables.add();
    v.kind = VariableKind.TEXTUAL;
    v.name = names[i];
    created++;
  }

  // 저장
  try {
    doc.save();
    // alert("총 " + created + "개의 변수를 생성하고 저장했습니다.");
  } catch (e) {
    // alert("문서 저장에 실패했습니다: " + e.message);
  }
})();
