/**
 * 모든 아트보드와 교차(전부 또는 일부)하는 페이지 아이템을 선택
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("열린 문서가 없습니다!"); return; }

  // ── 문서의 모든 아트보드 경계 수집 ──
  var ABs = []; // 각 원소: [L, T, R, B]
  for (var i = 0; i < doc.artboards.length; i++) {
    ABs.push(doc.artboards[i].artboardRect);
  }

  // ── 선택 대상 누적 ──
  var sel = [];

  // 문서의 모든 페이지 아이템 순회
  for (var k = 0; k < doc.pageItems.length; k++) {
    var it = doc.pageItems[k];
    if (it.locked || it.hidden) continue;          // 잠긴/숨김 오브젝트는 무시

    var g = it.geometricBounds;                    // [L, T, R, B]

    // 하나라도 아트보드와 교차하면 선택 목록에 추가
    for (var j = 0; j < ABs.length; j++) {
      var AB = ABs[j];

      var intersects =
        g[2] >= AB[0] &&   // item.right  ≥ ab.left
        g[0] <= AB[2] &&   // item.left   ≤ ab.right
        g[1] >= AB[3] &&   // item.top    ≥ ab.bottom
        g[3] <= AB[1];     // item.bottom ≤ ab.top

      if (intersects) {
        sel.push(it);
        break;  // 이미 선택됐으므로 다음 아이템으로
      }
    }
  }

  // ── Illustrator selection 반영 ──
  doc.selection = sel;
})();
