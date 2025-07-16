
(function () {
  /* ── 내부 stop() 유틸 ───────────────────────── */
  function stop(msg, code) {
    try { app.beep(); } catch (_) {}
    alert(msg);
    throw new Error(code || "SCRIPT_STOP");
  }

  /* ── 0) 문서 검사 ───────────────────────────── */
  if (app.documents.length === 0) {
    stop("❌ 문서가 없습니다.", "NO_DOCUMENT");
  }
  var doc = app.activeDocument;

  /* ── 1) 데이터셋 검사 ───────────────────────── */
  if (!doc || doc.dataSets.length === 0) {
    stop("❌ 데이터셋이 없습니다.", "NO_DATASETS");
  }

  /* ── 2) 변수 매핑 검사 ─────────────────────────
         방법 A: Variable.pageItems 길이
         방법 B: PageItem의 contentVariable / visibilityVariable / variable
  */
  function hasAnyVariableBinding(d) {
    // A: 변수 컬렉션 스캔
    var vars = d.variables;
    for (var i = 0; i < vars.length; i++) {
      try {
        if (vars[i].pageItems.length > 0) return true;
      } catch (e) {}
    }
    // B: 문서 전체 pageItems 스캔 (보조)
    var items = d.pageItems;
    for (var j = 0; j < items.length; j++) {
      var it = items[j], v;
      try { v = it.contentVariable;     if (v) return true; } catch (e1) {}
      try { v = it.visibilityVariable;  if (v) return true; } catch (e2) {}
      try { v = it.variable;            if (v) return true; } catch (e3) {}
    }
    return false;
  }

  if (!hasAnyVariableBinding(doc)) {
    stop("❌ 데이터셋은 있지만 변수에 매핑된 오브젝트가 하나도 없습니다.", "NO_BINDINGS");
  }

  /* ── 통과 ─────────────────────────────────────
     액션은 다음 단계로 계속 진행됩니다.
     (여기서 return 으로 조용히 끝냄)
  */
  // $.writeln("DataSets:", doc.dataSets.length, "→ Bindings OK"); // 필요시 로그
  return;
})();