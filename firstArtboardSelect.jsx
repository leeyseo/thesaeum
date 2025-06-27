(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // 첫 번째 아트보드를 활성화
  doc.artboards.setActiveArtboardIndex(0);

  // 해당 아트보드 위의 오브젝트 선택
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard();

  // 확인 메시지
  if (doc.selection.length > 0) {
    alert("✅ 첫 번째 아트보드의 오브젝트가 선택되었습니다.\n선택 수: " + doc.selection.length);
  } else {
    alert("❌ 첫 번째 아트보드에 선택할 오브젝트가 없습니다.");
  }
})();
