(function () {
  /* ───────── 0) 문서 검사 ───────── */
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다."); 
    return;
  }
  var doc = app.activeDocument;
  var abCount = doc.artboards.length;
  var originalIdx = doc.artboards.getActiveArtboardIndex(); // 나중에 복귀용

  /* ───────── 1) 아트보드 루프 ───────── */
  for (var idx = 0; idx < abCount; idx++) {

    // ① 아트보드 선택
    doc.selection = null;                        // 기존 선택 해제
    doc.artboards.setActiveArtboardIndex(idx);

    // ② “아트보드에서 모두 선택” (버전별 두 가지 방법)
    try {
      // 최신 버전: 메뉴 명령
      app.executeMenuCommand("selectallinartboard");
    } catch (e) {
      // 구버전 호환: 메서드
      if (typeof doc.selectObjectsOnActiveArtboard === "function") {
        doc.selectObjectsOnActiveArtboard();
      }
    }

    if (doc.selection.length === 0) {            // 아무것도 없으면 다음 아트보드
      continue;
    }

    // ③ 그룹 만들기 (선택 항목이 2개 이상일 때만 꼭 필요하지만, 1개여도 안전)
    app.executeMenuCommand("group");

    /* 그룹이 성공적으로 만들어지면
       selection[0] = 방금 만든 GroupItem 이므로 이름만 지정 */
    if (doc.selection.length === 1 &&
        doc.selection[0].typename === "GroupItem") {
      doc.selection[0].name = "AB_" + (idx + 1) + "_Group";
    }
  }

  /* ───────── 2) 원래 활성 아트보드로 복귀 ───────── */
  doc.artboards.setActiveArtboardIndex(originalIdx);
  doc.selection = null;

//   alert("✅ 각 아트보드 위 객체를 한 그룹으로 묶었습니다!");
})();