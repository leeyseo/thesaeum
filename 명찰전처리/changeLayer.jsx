/**
 * ① 모든 아트보드에 보이는 객체 → 해당 Artboard_N 레이어로 이동
 * ② 이동이 끝나면 원래 있던 레이어는 전부 삭제
 * ⚠︎ 되돌릴 수 없으니 파일을 먼저 저장(백업)하세요
 */
(function () {

  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc = app.activeDocument,
      N   = doc.artboards.length;



    /* 🔒 Illustrator 변수(Variables) 없으면 중단 */
  if (!doc.variables || doc.variables.length === 0) {
    alert("⚠️ 이 문서에는 변수(Variables)가 없습니다. 매핑여부를 확인하세요.");
    return;
  }



  /* ── 이미 Artboard_ 레이어가 있으면 작업 취소 ── */
  for (var i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i].name.indexOf("Artboard_") !== -1) {
      return;
    }
  }

  /* 0) 기존 레이어 목록 백업 & 잠금 해제 -------------------------------- */
  var oldLayers = [];
  for (var i = 0; i < doc.layers.length; i++) {
    var lay = doc.layers[i];
    lay.locked   = false;
    lay.template = false;
    lay.visible  = true;
    oldLayers.push(lay);
  }

  /* 1) 아트보드별 객체 이동 ------------------------------------------- */
  var moved = 0;
  for (var a = 0; a < N; a++) {

    // 대상 아트보드 활성화
    doc.artboards.setActiveArtboardIndex(a);

    // 대지 위 모두 선택 (Illustrator 내부 명령 – 빠름)
    app.executeMenuCommand("selectallinartboard");
    if (doc.selection.length === 0) continue;

    // 목적 레이어 확보 (없으면 생성)
    var destName = "Artboard_" + (a + 1);
    var dest;
    try      { dest = doc.layers.getByName(destName); }
    catch(e) { dest = doc.layers.add(); dest.name = destName; }
    dest.locked  = false;
    dest.visible = true;
    doc.activeLayer = dest;

    // move() 방식으로 변수 매핑 유지하며 이동
    var sel = doc.selection;
    for (var s = 0; s < sel.length; s++) {
      var item = sel[s];
      try {
        item.move(dest, ElementPlacement.PLACEATEND);
        moved++;
      } catch (e) {}
    }
  }

  /* 2) 기존 레이어 싹 삭제 ------------------------------------------- */
  var removed = 0;
  for (var j = 0; j < oldLayers.length; j++) {
    try { oldLayers[j].remove(); removed++; } catch (e) {}
  }

})();