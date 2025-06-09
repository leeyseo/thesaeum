(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc   = app.activeDocument,
      ABs   = doc.artboards,
      WHITE = (function(){ var c=new RGBColor(); c.red=c.green=c.blue=255; return c; })();

  /* ── 모든 레이어(하위 포함) × 모든 아트보드 순회 ───────────────── */
  forEachLayer(doc.layers, function (lay) {

    /* 잠금·숨김 해제 후 작업, 끝나면 복구 */
    var wasLocked = lay.locked,
        wasHidden = !lay.visible;
    if (wasLocked) lay.locked = false;
    if (wasHidden) lay.visible = true;

    for (var a = 0; a < ABs.length; a++) {
      var R = ABs[a].artboardRect,        // [L,T,R,B]
          L = R[0],  T = R[1],
          W = R[2] - R[0],
          H = R[1] - R[3],
          found = false;

      /* ① 이미 있는 배경 찾기 */
      for (var i = 0; i < lay.pathItems.length; i++) {
        var it = lay.pathItems[i];
        if (!it.closed) continue;
        var vb = it.visibleBounds,
            w = vb[2]-vb[0], h = vb[1]-vb[3],
            matchPos  = Math.abs(vb[0]-L)<1 && Math.abs(vb[1]-T)<1,
            matchSize = Math.abs(w-W)<1  && Math.abs(h-H)<1;

        if (matchPos && matchSize) {
          if (it.fillColor.typename === "NoColor") it.fillColor = WHITE;
          it.zOrder(ZOrderMethod.SENDTOBACK);      // 레이어 내부 맨 뒤
          found = true;
          break;
        }
      }

      /* ② 없으면 새로 만들기 */
      if (!found) {
        var bg = lay.pathItems.rectangle(T, L, W, H);
        bg.fillColor = WHITE;
        bg.stroked   = false;
        bg.zOrder(ZOrderMethod.SENDTOBACK);
      }
    }

    if (wasLocked) lay.locked = true;
    if (wasHidden) lay.visible = false;
  });

  // alert("✅ 모든 레이어·아트보드에 흰 배경 추가 완료!");

  /* --- 재귀 순회용 헬퍼 --- */
  function forEachLayer(col, fn) {
    for (var i = 0; i < col.length; i++) {
      fn(col[i]);
      if (col[i].layers.length) forEachLayer(col[i].layers, fn);
    }
  }
})();
