(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
  var layers = doc.layers;
  var baseNames = ["이름", "직책", "상호명"];

  // 변수 패널이 동작하는지 확인 (문서 저장 필수 조건)
  if (!doc.saved) {
    alert("변수를 생성하려면 먼저 문서를 저장해야 합니다.");
    return;
  }

  for (var i = 1; i <= layers.length; i++) {
    for (var j = 0; j < baseNames.length; j++) {
      var varName = baseNames[j] + "_" + i;

      // 변수 객체 생성 (텍스트용)
      var variable = doc.variables.add();
      variable.kind = VariableKind.TEXTUAL;
      variable.name = varName;
    }
  }

  alert("변수가 총 " + (layers.length * baseNames.length) + "개 생성되었습니다.\n변수 패널을 확인하세요!");
})();
