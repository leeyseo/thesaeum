/*
 * ClipToArtboards.jsx
 * ─────────────────────────────────────────
 * • 보이는 레이어 대상
 * • 아트보드 밖 데이터 선택 불가하도록 “마스크” 씌우기
 * • 내부 디자인 완전 보존 (패스, 스트로크, 라이브 효과 유지)
 * • 2025-07-10
 */
(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* ── 0) 보이는 레이어 잠금 해제 & 상태 저장 ── */
  var layerState = [];
  for (var i = 0; i < doc.layers.length; i++) {
    layerState[i] = { v: doc.layers[i].visible, l: doc.layers[i].locked };
    if (doc.layers[i].visible && doc.layers[i].locked) doc.layers[i].locked = false;
  }

  /* ── 1) 아트보드 정보 수집 ── */
  var AB = [];                      // [{L,T,R,B,W,H}]
  for (var a = 0; a < doc.artboards.length; a++) {
    var r = doc.artboards[a].artboardRect;
    AB.push({ L: r[0], T: r[1], R: r[2], B: r[3],
              W: r[2] - r[0], H: r[1] - r[3] });
  }

  /* ── 2) bbox 유틸 ── */
  function bb(it) {
    try { return it.visibleBounds; }
    catch (e) { return null; }
  }
  function overlaps(b, A) {
    return !(b[2] < A.L || b[0] > A.R || b[3] > A.T || b[1] < A.B);
  }
  function inside(b, A) {
    return (b[0] >= A.L && b[2] <= A.R && b[1] <= A.T && b[3] >= A.B);
  }

  /* ── 3) 클리핑 마스크 적용 함수 (✅ 수정됨) ── */
  function maskToArtboard(item, A) {
    var parent = item.parent;
    var grp = parent.groupItems.add();
    grp.name = "AB_clip";

    // ① 마스크용 투명 사각형 생성
    var clip = grp.pathItems.rectangle(A.T, A.L, A.W, A.H);
    clip.stroked = false;
    clip.filled = false;
    clip.clipping = true; // ← 먼저 설정, clipped는 나중에

    // ② 원본 오브젝트를 그룹 안으로 이동
    item.move(grp, ElementPlacement.PLACEATEND);

    // ③ 그룹 내 오브젝트 2개 이상일 때 clipped 설정 (✅ 오류 방지)
    grp.clipped = true;

    // ④ 그룹을 원래 위치에 삽입
    grp.move(item, ElementPlacement.PLACEAFTER);
  }

  /* ── 4) 1차 스캔: 삭제 & 겹침 오브젝트 수집 ── */
  var crossed = []; // [{it: PageItem, boards: [idx, ...]}]
  for (var p = doc.pageItems.length - 1; p >= 0; p--) {
    var it = doc.pageItems[p];
    if (!it.layer.visible || it.locked || it.guides) continue;

    var b = bb(it); if (!b) continue;

    var which = [];
    for (var j = 0; j < AB.length; j++) {
      if (overlaps(b, AB[j])) which.push(j);
    }

    if (which.length === 0) { it.remove(); continue; }

    var fullyInside = false;
    for (var w = 0; w < which.length; w++) {
      if (inside(b, AB[which[w]])) { fullyInside = true; break; }
    }

    if (fullyInside && which.length === 1) continue;

    crossed.push({ it: it, boards: which });
  }

  /* ── 5) 2차 스캔: 복제 후 마스크 적용 ── */
  for (var c = 0; c < crossed.length; c++) {
    var entry = crossed[c], src = entry.it;
    for (var bi = 0; bi < entry.boards.length; bi++) {
      var idx = entry.boards[bi];
      var dup = (bi === 0) ? src : src.duplicate();
      maskToArtboard(dup, AB[idx]);
    }
  }

  /* ── 6) 레이어 상태 복구 ── */
  for (var r = 0; r < layerState.length; r++) {
    doc.layers[r].visible = layerState[r].v;
    doc.layers[r].locked  = layerState[r].l;
  }

  alert("✅ 아트보드 밖 선택 불가! 모든 요소 마스크 처리 완료");
})();
