/**
 * Select everything that lies fully or partially
 * inside the active artboard.
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("열린 문서가 없습니다!"); return; }

  // ── 활성 아트보드의 경계 ──
  var ab      = doc.artboards[doc.artboards.getActiveArtboardIndex()];
  var AB      = ab.artboardRect;                    // [L, T, R, B]

  // 새 selection 배열 준비
  var sel = [];

  // 모든 페이지 아이템 순회
  for (var i = 0; i < doc.pageItems.length; i++) {
    var it = doc.pageItems[i];
    if (it.locked || it.hidden) continue;           // 잠긴/숨김은 제외

    var g  = it.geometricBounds;                    // [L, T, R, B]

    // ── 교집합(중첩) 판정 ──
    var intersects =
         g[2] >= AB[0] &&   // item.right  ≥ ab.left
         g[0] <= AB[2] &&   // item.left   ≤ ab.right
         g[1] >= AB[3] &&   // item.top    ≥ ab.bottom
         g[3] <= AB[1];     // item.bottom ≤ ab.top

    if (intersects) sel.push(it);
  }

  // Illustrator selection 에 반영
  doc.selection = sel;
})();
