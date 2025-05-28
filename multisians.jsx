(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다"); return; }

  var gap      = 50;                       // 아트보드 간 간격
  var dsCount  = doc.dataSets.length;
  if (dsCount === 0) { alert("데이터 세트가 없습니다"); return; }

  /* ── 1. 템플릿 아트보드/오브젝트 확보 ─────────────────────────── */
  var tplIdx  = doc.artboards.getActiveArtboardIndex();
  var tplAB   = doc.artboards[tplIdx];
  var tplRect = tplAB.artboardRect;        // [L, T, R, B]
  var abH     = tplRect[1] - tplRect[3];   // 높이

  // 템플릿 내부 오브젝트만 수집
  function inside(ab, it){
    var b = it.geometricBounds;            // [L,T,R,B]
    return b[0] >= ab[0] && b[2] <= ab[2] && b[3] >= ab[3] && b[1] <= ab[1];
  }
  var tplItems = [];
  for (var i = 0; i < doc.pageItems.length; i++){
    var it = doc.pageItems[i];
    if (!it.locked && !it.hidden && inside(tplRect, it)) tplItems.push(it);
  }
  if (!tplItems.length){ alert("템플릿 내부 오브젝트가 없습니다"); return; }

  var basePos = tplItems[0].position;      // 그룹 복사 시 기준 좌표

  /* ── 2. 데이터셋별로 아트보드+디자인 생성 ──────────────────── */
  for (var d = 0; d < dsCount; d++){
    doc.dataSets[d].display();             // ← 해당 데이터셋 값을 적용

    // (0번은 기존 템플릿 아트보드 재사용, 1번부터 새로 생성)
    var offsetY = -d * (abH + gap);        // 아래로 내려갈수록 Y가 음수
    var targetABIndex;
    if (d === 0){
      targetABIndex = tplIdx;
    }else{
      var newRect = [tplRect[0], tplRect[1]+offsetY,
                     tplRect[2], tplRect[3]+offsetY];
      targetABIndex = doc.artboards.add(newRect).index;
    }

    // 현재 데이터셋이 반영된 상태의 템플릿 오브젝트 복사
    var grp = doc.groupItems.add();
    for (var j = 0; j < tplItems.length; j++){
      tplItems[j].duplicate(grp, ElementPlacement.PLACEATEND);
    }
    grp.position = [grp.position[0], grp.position[1] + offsetY];
    grp.artboard = targetABIndex;
  }

  // 끝나면 첫 번째 데이터셋으로 다시 돌려놓기(선택 사항)
  doc.dataSets[0].display();
})();
