(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc   = app.activeDocument,
      MARG  = 10;   // 중앙 정렬 시 테두리와의 여백(pt)

  // ── 보조 함수: 그룹을 지정 아트보드 중앙으로 이동 ──
  function centerGroup(grp, abIdx, margin) {
    var abRect = doc.artboards[abIdx].artboardRect;     // [L,T,R,B]
    var abW = abRect[2] - abRect[0] - margin*2,
        abH = abRect[1] - abRect[3] - margin*2;

    var vb = grp.visibleBounds;                         // [L,T,R,B]
    var gW = vb[2] - vb[0],
        gH = vb[1] - vb[3];

    var targetLeft = abRect[0] + margin + (abW - gW) / 2;
    var targetTop  = abRect[1] - margin - (abH - gH) / 2;

    var dx = targetLeft - vb[0],
        dy = targetTop  - vb[1];

    grp.position = [grp.position[0] + dx, grp.position[1] + dy];
    try { grp.artboard = abIdx; } catch(_) {}
  }

  // ── 모든 아트보드 순회 ──
  for (var i = 0; i < doc.artboards.length; i++) {

    // 1) 대상 아트보드 활성화 & 선택
    doc.artboards.setActiveArtboardIndex(i);
    app.executeMenuCommand("deselectall");
    doc.selectObjectsOnActiveArtboard();

    if (doc.selection.length === 0) { continue; }

    // 2) 그룹화
    app.executeMenuCommand("group");
    var grp = doc.selection[0];

    // 3) 중앙 정렬
    centerGroup(grp, i, MARG);

    app.executeMenuCommand("deselectall");  // 다음 루프를 위해 선택 해제
  }

  // alert("✅ 모든 아트보드 처리 완료");
})();
