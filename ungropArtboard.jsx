
(function () {
  /* ───────── 0) 문서 검사 ───────── */
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }
  var doc = app.activeDocument;
  var abCount = doc.artboards.length;
  var origIdx = doc.artboards.getActiveArtboardIndex();  // 나중에 복귀용

  /* ───────── 1) 아트보드 루프 ───────── */
  for (var idx = 0; idx < abCount; idx++) {

    // ① 아트보드 활성화 & 선택 초기화
    doc.selection = null;
    doc.artboards.setActiveArtboardIndex(idx);

    // ② ‘아트보드에서 모두 선택’
    try {
      app.executeMenuCommand("selectallinartboard");       // CC 신버전
    } catch (e) {
      if (typeof doc.selectObjectsOnActiveArtboard === "function") {
        doc.selectObjectsOnActiveArtboard();               // CS6‑급
      }
    }

    if (doc.selection.length === 0) {
      continue;   // 이 아트보드엔 선택될 게 없음 → 다음
    }

    /* ───────── ③ 그룹 해제 반복 ─────────
       Illustrator 의 ‘Ungroup’ 명령은 한 번에 한 단계만 풀기 때문에
       선택 안에 그룹이 사라질 때까지 반복 실행합니다.
    */
    var loopGuard = 10;    // 무한 루프 방지용 최대 반복 횟수
    function selectionHasGroup() {
      for (var s = 0; s < doc.selection.length; s++) {
        if (doc.selection[s].typename === "GroupItem") return true;
      }
      return false;
    }

    while (selectionHasGroup() && loopGuard-- > 0) {
      app.executeMenuCommand("ungroup");
    }
  }

  /* ───────── 2) 원래 아트보드로 복귀 & 선택 해제 ───────── */
  doc.artboards.setActiveArtboardIndex(origIdx);
  doc.selection = null;


})();