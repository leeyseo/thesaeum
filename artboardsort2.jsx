// #target illustrator
/* ───────────────────── 2열 재정렬: 홀수=왼쪽, 짝수=오른쪽 (ES3) ─────────────────────
   · 행 판단에 ‘TOL’ 사용 안 함. 위에서 아래로 Y값만으로 2개씩 짝짓고,
     각 짝 내부는 Left 작은 것이 앞(=홀수)이 되도록 강제.
   · 0번(첫 번째) 아트보드는 재활용(덮어쓰기)하고 나머지는 새로 만듦.
   ──────────────────────────────────────────────────────────────────────────── */
(function () {
  if (app.documents.length === 0) { alert("❌ 열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;
  if (doc.artboards.length <= 1) return;

  // 1) 대지 정보 수집
  var boards = [];  // { idx, rect, left, top, name }
  var i;
  for (i = 0; i < doc.artboards.length; i++) {
    var ab = doc.artboards[i];
    var rc = ab.artboardRect; // [L,T,R,B]
    boards.push({
      idx  : i,
      rect : [rc[0], rc[1], rc[2], rc[3]],
      left : rc[0],
      top  : rc[1],
      name : ab.name
    });
  }

  // 2) Y(Top)만으로 내림차순 정렬: 가장 위가 먼저
  boards.sort(function (a, b) { return b.top - a.top; });

  // 3) 2개씩 묶고, 각 묶음은 좌→우로 정렬하여 홀수=왼쪽, 짝수=오른쪽 보장
  var target = [];
  var n = boards.length;
  var j = 0;
  while (j < n) {
    if (j + 1 < n) {
      // 두 개로 한 행 구성
      var A = boards[j], B = boards[j + 1];
      // 좌→우 정렬
      if (A.left <= B.left) {
        target.push(A, B); // A=홀수(왼쪽), B=짝수(오른쪽)
      } else {
        target.push(B, A); // B=홀수(왼쪽), A=짝수(오른쪽)
      }
      j += 2;
    } else {
      // 남은 1개(홀수 개수인 경우): 단독 행, 왼쪽에 배치되는 것으로 간주
      target.push(boards[j]);
      j += 1;
    }
  }

  // 4) 변경 없으면 종료
  var changed = false;
  for (i = 0; i < target.length; i++) {
    if (target[i].idx !== i) { changed = true; break; }
  }
  if (!changed) return;

  // 5) 0번 대지 재활용 (rect/name 덮어쓰기)
  doc.artboards[0].artboardRect = target[0].rect.slice(0);
  doc.artboards[0].name         = target[0].name;

  // 6) 나머지 새 아트보드 생성
  var originalCount = doc.artboards.length;
  for (i = 1; i < target.length; i++) {
    var nb = doc.artboards.add(target[i].rect.slice(0));
    nb.name = target[i].name;
  }

  // 7) 기존 1번 이후 대지 삭제 (뒤에서 앞으로)
  for (i = originalCount - 1; i >= 1; i--) {
    try { doc.artboards[i].remove(); } catch (e) {}
  }
})();
