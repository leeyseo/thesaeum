// #target "Illustrator"

(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc     = app.activeDocument;
  var abCount = doc.artboards.length;

  /* ── 0. 맨 아래 레이어 확보 ── */
  var bottomLayer           = doc.layers[doc.layers.length - 1];
  var restoreLock  = bottomLayer.locked;
  var restoreHide  = !bottomLayer.visible;
  if (restoreLock) bottomLayer.locked = false;
  if (restoreHide) bottomLayer.visible = true;

  /* 흰색 객체 */
  var white = new RGBColor(); white.red = white.green = white.blue = 255;

  /* ── 1. 각 아트보드마다 배경 처리 ── */
  for (var ai = 0; ai < abCount; ai++) {

    var abRect = doc.artboards[ai].artboardRect; // [L,T,R,B]
    var abLeft = abRect[0], abTop = abRect[1],
        abW    = abRect[2] - abRect[0],
        abH    = abRect[1] - abRect[3];

    var found = false;

    /* 1-1) 배경 후보 검색 */
    for (var j = 0; j < doc.pageItems.length; j++) {
      var it = doc.pageItems[j];
      if (it.locked || it.hidden) continue;

      var vb = it.visibleBounds;               // [L,T,R,B]
      var w  = vb[2] - vb[0], h = vb[1] - vb[3];

      var sameSize = Math.abs(w - abW) < 1 && Math.abs(h - abH) < 1;
      var samePos  = Math.abs(vb[0] - abLeft) < 1 && Math.abs(vb[1] - abTop) < 1;
      if (!sameSize || !samePos) continue;     // 아트보드와 정확히 일치한 것만

      /* ── (A) 이미 흰색이면 그냥 통과 ── */
      if (it.filled && it.fillColor.typename === "RGBColor") {
        var fc = it.fillColor;
        if (fc.red === 255 && fc.green === 255 && fc.blue === 255) {
          found = true;        // 흰 배경 존재 → 추가 작업 없음
          break;
        }
      }

      /* ── (B) 투명 → 흰색 변환 ── */
      if (!it.filled || it.fillColor.typename === "NoColor") {
        it.filled    = true;
        it.fillColor = white;
      }

      /* ── (C) 흰색이 아니면 색은 유지하되 뒤로 보내기 ── */
      it.move(bottomLayer, ElementPlacement.PLACEATEND);
      it.zOrder(ZOrderMethod.SENDTOBACK);
      found = true;
      break;
    }

    /* 1-2) 후보가 없으면 새 사각형 생성 */
    if (!found) {
      var bg = bottomLayer.pathItems.rectangle(abTop, abLeft, abW, abH);
      bg.fillColor = white;
      bg.stroked   = false;
      bg.zOrder(ZOrderMethod.SENDTOBACK);
    }
  }

  /* ── 2. 레이어 상태 복구 ── */
  if (restoreLock) bottomLayer.locked  = true;
  if (restoreHide) bottomLayer.visible = false;

  // alert("✔ 투명 배경을 흰색으로 변환했고, 이미 흰 배경은 그대로 두었습니다.");
})();



(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
  var noStroke = new NoColor();
  var count = 0;

  /* ───────── 모든 오브젝트 순회 (잠김/숨김 제외) ───────── */
  function traverseVisible(layer) {
    if (!layer.visible) return;
    for (var i = 0; i < layer.pageItems.length; i++) {
      processItem(layer.pageItems[i]);
    }

    // 하위 레이어도 포함
    for (var j = 0; j < layer.layers.length; j++) {
      traverseVisible(layer.layers[j]);
    }
  }

  function processItem(item) {
    if (!item || item.locked || item.hidden) return;
    if (item.layer && item.layer.name.indexOf("칼선") !== -1) return;

    // 그룹인 경우 안쪽으로 순회
    if (item.typename === "GroupItem") {
      for (var i = 0; i < item.pageItems.length; i++) {
        processItem(item.pageItems[i]);
      }
    }

    // 복합패스는 pathItems 사용
    else if (item.typename === "CompoundPathItem") {
      for (var j = 0; j < item.pathItems.length; j++) {
        processItem(item.pathItems[j]);
      }
    }

    // 기본 객체 처리
    else {
      try {
        if (item.stroked) {
          item.strokeColor = noStroke;
          count++;
        }
      } catch (e) { /* 일부는 stroke 속성 없음 */ }
    }
  }

  /* ───────── 전체 레이어 탐색 시작 ───────── */
  for (var i = 0; i < doc.layers.length; i++) {
    traverseVisible(doc.layers[i]);
  }

  // alert("외곽선 투명 처리 완료: " + count + "개");
})();



/**
 * ① 모든 아트보드에 보이는 객체 → 해당 Artboard_N 레이어로 이동
 * ② 이동이 끝나면 원래 있던 레이어는 전부 삭제
 * ⚠︎ 되돌릴 수 없으니 파일을 먼저 저장(백업)하세요
 */
(function () {

  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc = app.activeDocument,
      N   = doc.artboards.length;

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

    // Cut → Paste In Place
    app.executeMenuCommand("cut");
    app.executeMenuCommand("pasteInPlace");

    moved += doc.selection.length;   // 방금 붙여넣은 개수
  }

  /* 2) 기존 레이어 싹 삭제 ------------------------------------------- */
  var removed = 0;
  for (var j = 0; j < oldLayers.length; j++) {
    try { oldLayers[j].remove(); removed++; } catch (e) {}
  }

})();