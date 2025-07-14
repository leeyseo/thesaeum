/**
 * ① 아트보드 1-2, 3-4 … 두 장씩의 객체를
 *      →  Artboard_1, Artboard_2 … 레이어로 ‘이동’
 *      ( = end 값을 2로 나눈 후 올림 → x,  이름은 Artboard_x )
 * ② 이동 뒤 “빈 레이어”만 삭제
 * ES3 ExtendScript  |  Illustrator CS3+
 */
(function () {

  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc = app.activeDocument,
      N   = doc.artboards.length;


    /* ── 이미 Artboard_ 레이어가 있으면 작업 취소 ── */
  for (var i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i].name.indexOf("Artboard_") !== -1) {
      // alert("이미 'Artboard_' 레이어가 존재합니다. 작업을 건너뜁니다.");
      return;
    }
  }


  /* 0) 기존 레이어 잠금·가이드 해제 + 백업 ---------------------------- */
  var oldLayers = [];
  for (var i = 0; i < doc.layers.length; i++) {
    var L = doc.layers[i];
    L.locked = false; L.template = false; L.visible = true;
    oldLayers.push(L);
  }

  /* 1) 아트보드 두 장씩 묶어 이동 ----------------------------------- */
  var moved = 0;
  for (var a = 0; a < N; a += 2) {

    /* 1-A. 목적 레이어 이름 계산 */
    var end      = Math.min(a + 2, N),          // 묶음의 마지막 아트보드 번호
        pairIdx  = Math.ceil(end / 2),          // end ÷2 올림
        destName = "Artboard_" + pairIdx;       // 예: Artboard_1, _2…

    var dest;
    try      { dest = doc.layers.getByName(destName); }
    catch(e) { dest = doc.layers.add(); dest.name = destName; }
    dest.locked = false; dest.visible = true;
    doc.activeLayer = dest;

    /* 1-B. 묶음 안의 각 아트보드 처리 */
    for (var k = 0; k < 2 && (a + k) < N; k++) {
      doc.artboards.setActiveArtboardIndex(a + k);
      app.executeMenuCommand("selectallinartboard");
      if (doc.selection.length === 0) continue;

      var sel = doc.selection;
      for (var s = 0; s < sel.length; s++) {
        try { sel[s].locked = false;
              sel[s].move(dest, ElementPlacement.PLACEATEND);
              moved++; }
        catch (_) {}
      }
      doc.selection = null;
    }
  }

  /* 2) 빈 레이어만 삭제 --------------------------------------------- */
  var removed = 0;
  for (i = 0; i < oldLayers.length; i++) {
    var lay = oldLayers[i];
    if (lay.pageItems.length === 0 && lay.layers.length === 0) {
      try { lay.remove(); removed++; } catch (_) {}
    }
  }

  // alert("디자인 이동: " + moved +
  //       "개\n삭제된 빈 레이어: " + removed + "개");
})();
