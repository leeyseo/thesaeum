/* ──────────────────────── 아트보드(대지) 번호 재정렬 스크립트 ───────────────────────
   · 0번(첫 번째) 아트보드는 유지, 나머지 번호만 재정렬
   · 정렬 기준 : 위쪽 행부터(Top 값 큰 순) → 행 내부는 왼쪽부터(Left 값 작은 순)
   · 디자인(페이지 아이템)에는 영향 없음
   · Illustrator ES3-compatible ExtendScript
   ──────────────────────────────────────────────────────────────────────────────── */

(function () {

  /* 0) 문서 확인 */
  if (app.documents.length === 0) {
    alert("❌ 열린 문서가 없습니다.");
    return;
  }
  var doc = app.activeDocument;

  /* 1) 원본 대지 정보 수집 */
  var boards = [];  // { idx, rect, left, top, name }
  for (var i = 0; i < doc.artboards.length; i++) {
    var ab = doc.artboards[i];
    var r  = ab.artboardRect;          // [L, T, R, B];  y축 ↑
    boards.push({
      idx  : i,
      rect : r.slice(0),               // 깊은 복사
      left : r[0],
      top  : r[1],
      name : ab.name
    });
  }

  /* 2) 좌→우, 위→아래 순으로 정렬 */
  var ROW_TOL = 2;  // pt ─ 같은 행 판정 허용 오차(≈0.7 mm)
  boards.sort(function (a, b) {
    // (1) 행 비교 : Top 값 차이가 TOL 이상이면 높은(top) 순
    if (Math.abs(a.top - b.top) > ROW_TOL) {
      return b.top - a.top;            // 위쪽(큰 top) 먼저
    }
    // (2) 열 비교 : 같은 행이면 Left 순
    return a.left - b.left;            // 왼쪽(작은 left) 먼저
  });

  /* 3) 이미 정렬돼 있으면 종료 */
  var changed = false;
  for (i = 0; i < boards.length; i++) {
    if (boards[i].idx !== i) { changed = true; break; }
  }
  if (!changed) {
    // alert("✅ 이미 올바른 순서입니다!");
    return;
  }

  /* 4) 0번(첫 번째) 아트보드 재활용 ─ rect·name 덮어쓰기 */
  doc.artboards[0].artboardRect = boards[0].rect.slice(0);
  doc.artboards[0].name         = boards[0].name;

  /* 5) 나머지(1~) 새 아트보드 추가 */
  var originalCount = doc.artboards.length;  // 기존 총 개수
  for (i = 1; i < boards.length; i++) {
    var nb = doc.artboards.add(boards[i].rect.slice(0));
    nb.name = boards[i].name;
  }

  /* 6) 기존 아트보드(1번 이상) 삭제 ─ 뒤에서 앞으로 */
  for (i = originalCount - 1; i >= 1; i--) {
    doc.artboards[i].remove();
  }

  // alert("✅ 대지 번호가 재정렬되었습니다!");

})();
