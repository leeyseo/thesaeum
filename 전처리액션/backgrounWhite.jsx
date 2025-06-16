/**
 * 🔲 모든 레이어(하위 포함) × 모든 아트보드마다
 *    1) 해당 아트보드 크기의 흰 배경 사각형이 이미 있으면 → 맨 뒤로 보냄
 *    2) 없으면 새로 만듦
 *       - 잠금·숨김·가이드(template) 레이어까지 자동 해제했다가 복구
 * ES3 ExtendScript  |  Illustrator CS3 이상
 */
(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다"); return; }

  var doc = app.activeDocument,
      ABs = doc.artboards,
      WHITE = (function () { var c = new RGBColor(); c.red = c.green = c.blue = 255; return c; })();

  /* ───────────────────────────────────────────────────────── */
  forEachLayer(doc.layers, function (lay) {

    /* 1. 작업 전: 상위까지 잠금/가이드/숨김 해제 */
    var saved = unlockChain(lay);

    for (var a = 0; a < ABs.length; a++) {
      var R = ABs[a].artboardRect,           // [L,T,R,B]
          L = R[0],  T = R[1],
          W = R[2] - R[0],
          H = R[1] - R[3],
          found = false;

      /* 1-A) 이미 있는 배경 찾기 */
      for (var i = 0; i < lay.pathItems.length; i++) {
        var it = lay.pathItems[i];
        if (!it.closed) continue;            // 사각형이 아닌 경우 skip

        var vb = it.visibleBounds,
            w  = vb[2] - vb[0],
            h  = vb[1] - vb[3],
            samePos  = Math.abs(vb[0] - L) < 1 && Math.abs(vb[1] - T) < 1,
            sameSize = Math.abs(w - W) < 1  && Math.abs(h - H) < 1;

        if (samePos && sameSize) {
          if (it.fillColor.typename === "NoColor") it.fillColor = WHITE;
          it.stroked = false;
          it.zOrder(ZOrderMethod.SENDTOBACK);
          found = true;
          break;
        }
      }

      /* 1-B) 없으면 새로 생성 */
      if (!found) {
        doc.activeLayer = lay;                         // 반드시 활성화
        var bg = lay.pathItems.rectangle(T, L, W, H);
        bg.fillColor = WHITE;
        bg.stroked   = false;
        bg.zOrder(ZOrderMethod.SENDTOBACK);
      }
    }

    /* 2. 작업 후: 레이어 상태 복구 */
    restoreChain(saved);

  });
  // alert("✅ 모든 레이어·아트보드에 흰 배경 완료!");

  /* ── 헬퍼들 ───────────────────────────────────────────── */

  /* 레이어 트리 재귀 순회 */
  function forEachLayer(col, fn) {
    for (var i = 0; i < col.length; i++) {
      fn(col[i]);
      if (col[i].layers.length) forEachLayer(col[i].layers, fn);
    }
  }

  /* 상위 포함 잠금·가이드·숨김 해제, 상태 저장 반환 */
  function unlockChain(lay) {
    var arr = [];
    var cur = lay;
    while (cur) {
      arr.push({ layer: cur,
                 locked: cur.locked,
                 visible: cur.visible,
                 template: cur.template });
      cur.locked   = false;
      cur.visible  = true;
      cur.template = false;
      cur = (cur.parent && cur.parent.typename === "Layer") ? cur.parent : null;
    }
    return arr;
  }

  /* 저장된 상태로 복구 */
  function restoreChain(arr) {
    for (var i = 0; i < arr.length; i++) {
      var s = arr[i];
      s.layer.locked   = s.locked;
      s.layer.visible  = s.visible;
      s.layer.template = s.template;
    }
  }
})();
