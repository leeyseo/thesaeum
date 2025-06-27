/**
 * ① 현재 아트보드 크기(w·h) 목록 저장
 * ② 화면에 보이는 pageItems 중
 *      ↳ (자신·부모 레이어가 모두 unlocked & visible)
 *      ↳ 어떤 아트보드에도 겹치지 않는 것만 수집
 * ③ 겹치는 바운딩박스를 병합해 덩어리(rect) 목록 생성
 * ④ 덩어리 크기가 기존 아트보드 크기와 ±TOL 이내면
 *      ↳ 새 아트보드 추가 (+MARGIN)
 * ⑤ 방금 채워진 디자인만 선택 상태 유지
 */
(function () {
  var TOL    = 10;   // 허용 오차(pt)
  var MARGIN =  0;   // 새 아트보드 여백(pt)

  /* ───────────── 0) 문서 검사 ───────────── */
  var doc = app.activeDocument;
  if (!doc) { alert("열린 문서가 없습니다."); return; }

  /* ───── 1) 기존 아트보드 크기 목록 ───── */
  var ABRects = [];             // [L,T,R,B]
  var refSize = [];             // [{w,h}, …]
  for (var i = 0; i < doc.artboards.length; i++) {
    var r = doc.artboards[i].artboardRect;
    ABRects.push(r);
    refSize.push({ w: r[2] - r[0], h: r[1] - r[3] });
  }
  function sizeMatch(w, h) {
    for (var k = 0; k < refSize.length; k++) {
      if (Math.abs(w - refSize[k].w) <= TOL &&
          Math.abs(h - refSize[k].h) <= TOL) return true;
    }
    return false;
  }
  function intersects(a, b) {
    return !(a[2] < b[0] || a[0] > b[2] || a[1] < b[3] || a[3] > b[1]);
  }
  function mergeRect(a, b) {
    return [ Math.min(a[0], b[0]), Math.max(a[1], b[1]),
             Math.max(a[2], b[2]), Math.min(a[3], b[3]) ];
  }

  /* ───── 2) ‘대지 밖 & 보이는’ 디자인 수집 ───── */
  var rectPool = [], itemPool = [];
  for (i = 0; i < doc.pageItems.length; i++) {
    var it = doc.pageItems[i];

    /* 2-1) 자신 또는 부모 레이어가 잠김/숨김이면 건너뜀 */
    if (it.locked || it.hidden) continue;
    var lay = it.layer;
    if (lay.locked || !lay.visible) continue;

    /* 2-2) 기존 아트보드와 겹치면 건너뜀 */
    var bb = it.visibleBounds, onBoard = false;
    for (var j = 0; j < ABRects.length; j++) {
      if (intersects(bb, ABRects[j])) { onBoard = true; break; }
    }
    if (onBoard) continue;

    /* ‘대지 밖’ & ‘수정 가능한’ 오브젝트만 저장 */
    rectPool.push(bb);
    itemPool.push(it);
  }
  if (!rectPool.length) { alert("대지 밖(그리고 보이는) 디자인이 없습니다."); return; }

  /* ───── 3) 겹침 병합 → 덩어리(chunks) ───── */
  var chunks = [];
  while (rectPool.length) {
    var cur = rectPool.pop(), merged = false;
    for (i = 0; i < chunks.length; i++) {
      if (intersects(cur, chunks[i])) {
        chunks[i] = mergeRect(cur, chunks[i]);
        merged = true; break;
      }
    }
    if (!merged) chunks.push(cur);
  }

  /* ───── 4) 기준 크기와 맞는 덩어리만 아트보드 생성 ───── */
  var added = 0, matchedSet = {};          // Object → 중복 방지
  for (i = 0; i < chunks.length; i++) {
    var g = chunks[i],
        W = g[2] - g[0],
        H = g[1] - g[3];

    if (!sizeMatch(W, H)) continue;        // 폭·높이가 기준과 다르면 skip

    var L = g[0] - MARGIN,
        T = g[1] + MARGIN,
        R = g[2] + MARGIN,
        B = g[3] - MARGIN;
    doc.artboards.add([L, T, R, B]);       // 새 아트보드 추가
    added++;

    /* 덩어리 안에 들어간 오브젝트 → matchedSet */
    for (var p = 0; p < itemPool.length; p++) {
      var bb = itemPool[p].visibleBounds;
      if (bb[0] >= g[0]-0.1 && bb[2] <= g[2]+0.1 &&
          bb[3] >= g[3]-0.1 && bb[1] <= g[1]+0.1)
        matchedSet[itemPool[p].id] = itemPool[p];
    }
  }

  /* ───── 5) 선택 상태 정리 ───── */
  var sel = [];
  for (var key in matchedSet) sel.push(matchedSet[key]);
  doc.selection = sel;           // 숨김/잠김 오브젝트가 없으므로 오류 없음

  alert("➕ 새 아트보드: " + added +
        "개\n✅ 선택된 디자인: " + sel.length + "개");
})();
