/**
 * ▶ 현재 문서의 “모든” 오브젝트 선택
 *    1) 잠금 해제 · 숨김 해제
 *    2) pageItems 전체를 selection 에 넣기
 */
(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다!");
    return;
  }

  var doc = app.activeDocument;

  /* 1) 전부 표시·잠금 해제 (메뉴 명령 그대로 호출) */
  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  /* 2) 전체 페이지 아이템을 selection 에 할당 */
  var all = [];
  for (var i = 0; i < doc.pageItems.length; i++) {
    all.push(doc.pageItems[i]);
  }
  doc.selection = all;        // = “Ctrl/Cmd + A” 와 동일 효과
})();