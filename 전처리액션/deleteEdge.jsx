(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc       = app.activeDocument;
  var noStroke  = new NoColor();        // 투명색
  var abCount   = doc.artboards.length;
  var changed   = 0;
  var oldIndex  = doc.artboards.getActiveArtboardIndex(); // 복원용

  /* ───────────────── 대지별 처리 ───────────────── */
  for (var a = 0; a < abCount; a++) {
    doc.selection = null;                       // 선택 초기화
    doc.artboards.setActiveArtboardIndex(a);    // 대지 활성
    doc.selectObjectsOnActiveArtboard();        // 해당 대지 객체 선택

    var sel = doc.selection;
    for (var i = 0; i < sel.length; i++) recurse(sel[i]);
  }

  /* ───────────────── 복원 및 완료 알림 ───────────────── */
  doc.artboards.setActiveArtboardIndex(oldIndex);
  alert("외곽선 투명색 적용: " + changed + "개 완료");

  /* ──────────── 그룹/복합패스 재귀 처리 함수 ──────────── */
  function recurse(item) {
    if (item.locked || item.hidden) return;          // 잠김/숨김 건너뜀
    if (item.layer && item.layer.name.indexOf("칼선") !== -1) return; // ‘칼선’ 레이어 건너뜀

    if (item.typename === "GroupItem" || item.typename === "CompoundPathItem") {
      for (var j = 0; j < item.pageItems.length; j++) recurse(item.pageItems[j]);
    } else {
      try {
        if (item.stroked) {
          item.strokeColor = noStroke;
          changed++;
        }
      } catch (e) { /* 일부 항목은 stroked 속성이 없음 */ }
    }
  }
})();
