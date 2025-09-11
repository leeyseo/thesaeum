(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* ── 1) 기존 변수 삭제 ── */
  for (var i = doc.variables.length - 1; i >= 0; i--) {
    try { doc.variables[i].remove(); } catch (e) {
      alert("변수 삭제 중 오류: " + e.message); return;
    }
  }

  /* ── 2) 새 변수 생성 ── */
  var baseNames = ["이름", "직책", "영업소", "비고","이미지a","이미지b", "자료a","자료b","자료c","자료d","자료e","자료f" ];
  var abCount   = doc.artboards.length;
  if (abCount === 0) { alert("❗ 아트보드가 없습니다."); return; }

  var created = 0;

  // 홀수(1·3·5…) 아트보드만 대상
  for (var ab = 1; ab <= abCount; ab++) {               // ← +2씩 증가
    for (var j = 0; j < baseNames.length; j++) {
      var key     = baseNames[j];
      var varName = key + "_" + ab;                        // 이름_1, 이름_3, …

      try {
        var v   = doc.variables.add();
        v.kind  = (key.indexOf("이미지") === 0) ? VariableKind.IMAGE  // 이미지 변수
                                     : VariableKind.TEXTUAL;
        v.name  = varName;
        created++;
      } catch (e) {
        alert("변수 생성 오류: " + varName + "\n" + e.message);
        return;
      }
    }
  }

  /* ── 3) 문서 저장 ── */
  try { doc.save(); } catch (e) {/* 변수는 생성됐으니 저장 실패는 무시 가능 */ }

  // $.writeln("✅ 변수 " + created + "개 생성(홀수 아트보드만)");
})();
