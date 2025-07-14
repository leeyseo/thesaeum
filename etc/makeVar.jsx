(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // ───────── 기존 변수 모두 안전하게 삭제 ─────────
  for (var i = doc.variables.length - 1; i >= 0; i--) {
    try {
      doc.variables[i].remove();
    } catch (e) {
      alert("변수 삭제 중 오류 발생: " + e.message);
      return;
    }
  }

  // ───────── 변수 생성 ─────────
  var baseNames = ["이름", "직책", "영업소", "비고", "자료a"];
  var abCount = doc.artboards.length;
  if (abCount === 0) {
    alert("❗ 아트보드가 없습니다.");
    return;
  }

  var created = 0;

  for (var ab = 1; ab <= abCount; ab++) {
    for (var j = 0; j < baseNames.length; j++) {
      var varName = baseNames[j] + "_" + ab;

      try {
        var variable = doc.variables.add();
        variable.kind = VariableKind.TEXTUAL;
        variable.name = varName;
        created++;
      } catch (e) {
        alert("변수 생성 오류: " + varName + "\n" + e.message);
        return;
      }
    }
  }

  // ───────── 문서 저장 ─────────
  try {
    doc.save();
    // $.writeln("✅ 저장 완료: " + created + "개 변수 생성");
  } catch (e) {
    // alert("⚠ 변수는 생성되었지만 저장에 실패했습니다:\n" + e.message);
  }
})();
