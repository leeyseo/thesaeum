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
