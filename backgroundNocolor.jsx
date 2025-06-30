/* ── 배경(아트보드 크기와 거의 같은 도형) → 투명색 ── */
(function () {
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument,
      boards = [], fixed = 0;

  /* 허용 비율 오차 (%) 및 최소 절대 오차(pt) */
  var RAT_TOL = 0.05,   // ±5 %
      ABS_TOL = 4;      // ±4 pt

  /* 아트보드 정보 캐시 */
  for (var i = 0; i < doc.artboards.length; i++) {
    var r = doc.artboards[i].artboardRect;               // [L,T,R,B]
    boards.push({W: r[2]-r[0], H: r[1]-r[3]});
  }

  /* 기준 충족 여부 체크 */
  function near(val, target) {
    return Math.abs(val-target) <= Math.max(target*RAT_TOL, ABS_TOL);
  }

  var noCol = new NoColor();

  /* 페이지 아이템 순회 */
  for (var p = 0; p < doc.pageItems.length; p++) {
    var it = doc.pageItems[p];
    if (it.locked || it.hidden || !it.layer.visible) continue;
    if (it.typename !== "PathItem" || !it.filled)    continue;

    var g = it.geometricBounds, w = g[2]-g[0], h = g[1]-g[3];

    for (var b = 0; b < boards.length; b++) {
      var ab = boards[b];
      if (near(w, ab.W) && near(h, ab.H)) {      // 크기만 비교
        it.fillColor = noCol;
        fixed++;
        break;
      }
    }
  }

  // alert("✅ 투명 처리된 배경 개수: " + fixed);
})();
