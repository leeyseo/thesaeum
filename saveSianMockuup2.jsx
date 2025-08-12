(function () {
  /* ── 0) 문서 검사 ────────────────────────────────────────── */
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc      = app.activeDocument;
  var abTotal  = doc.artboards.length;
  if (abTotal === 0) { alert("아트보드가 없습니다."); return; }

  // var fileStem = decodeURI(doc.name).replace(/\.ai$/i, "");

  // // 1) '_'로 분리
  // var parts = fileStem.split("_");

  // // 2) 날짜-번호 토큰 찾기 + (+ab) 제거
  // var dateIdx = -1;
  // for (var i = 0; i < parts.length; i++) {
  //   // 예: 20250812-0000765-01 또는 20250812-0000765-01+ab
  //   var m = parts[i].match(/^(\d{8}-\d{7}(?:-\d+)?)(?:\+.*)?$/);
  //   if (m) {
  //     parts[i] = m[1]; // + 뒤 보고단위 제거
  //     dateIdx = i;
  //     break;
  //   }
  // }
  // if (dateIdx === -1) {
  //   alert("❌ 날짜-번호 형식을 찾지 못했습니다.");
  //   return;
  // }

  // // 3) 찾은 날짜 토큰 바로 앞의 두 토큰 제거 (예: 임종기, 1)
  // if (dateIdx > 1) {
  //   parts.splice(dateIdx - 2, 2);
  // }

  // // 4) 최종 파일명
  // var baseName = parts.join("_");
  var baseName =decodeURI(doc.name).replace(/\.ai$/i, "");


  var GAP_H    = 10;   // 좌우(열 간) 간격
  var GAP_V    = 10;   // 상하(행 간) 간격

  /* ── 1) 각 아트보드 크기 수집 ---------------------------------- */
  var widths  = [], heights = [];
  for (var i = 0; i < abTotal; i++) {
    var r = doc.artboards[i].artboardRect;   // [L,T,R,B]
    widths[i]  = r[2] - r[0];
    heights[i] = r[1] - r[3];
  }

  /* ── 1-1) 열별 최대 폭 계산 (왼쪽 열: 짝 idx, 오른쪽 열: 홀 idx) --- */
  var maxW1 = 0, maxW2 = 0;  // 열 1, 열 2의 최대 폭
  for (i = 0; i < abTotal; i++) {
    if (i % 2 === 0) { if (widths[i]  > maxW1) maxW1 = widths[i]; }
    else             { if (widths[i]  > maxW2) maxW2 = widths[i]; }
  }
  var totalW = (maxW2 > 0) ? (maxW1 + GAP_H + maxW2) : maxW1;

  /* ── 1-2) 전체 높이(행 단위) 계산 ------------------------------- */
  var totalH = 0;
  for (i = 0; i < abTotal; i += 2) {
    var h1 = heights[i];
    var h2 = (i + 1 < abTotal) ? heights[i + 1] : 0;
    var rowH = Math.max(h1, h2);
    totalH += rowH;
    if (i + 2 < abTotal) totalH += GAP_V;
  }

  /* ── 2) 새 문서 생성 ------------------------------------------- */
  var comp = app.documents.add(DocumentColorSpace.RGB, totalW, totalH);
  comp.artboards[0].artboardRect = [0, totalH, totalW, 0];

  /* 복사-붙여넣기 & 위치 맞추기 (toX: 좌측, toTopY: 상단) */
  /* ── 붙여넣기 & 위치 맞추기: 아트보드 앵커 방식 ───────────────────────── */
  function pasteBoard(srcIdx, destDoc, toX, toTopY) {
    // 1) 소스 아트보드에 '앵커' 사각형 잠깐 깔기 (노필/노스트로크)
    doc.activate();
    doc.artboards.setActiveArtboardIndex(srcIdx);
    var abRect = doc.artboards[srcIdx].artboardRect; // [L,T,R,B]
    var abW = abRect[2] - abRect[0];
    var abH = abRect[1] - abRect[3];

    // 좌상단이 (L,T)인 rectangle 생성 (Illustrator 규칙)
    var anchorName = "__AB_ANCHOR__" + (new Date().getTime()) + "_" + srcIdx;
    var anchor = doc.pathItems.rectangle(abRect[1], abRect[0], abW, abH);
    anchor.stroked = false;
    anchor.filled  = false;
    anchor.name    = anchorName;

    // 2) 아트보드 전체 선택 후 복사
    app.executeMenuCommand("deselectall");
    doc.selectObjectsOnActiveArtboard();
    app.copy();

    // 소스 쪽 앵커는 즉시 삭제 (문서에 남기지 않기)
    try { anchor.remove(); } catch(e) {}

    // 3) 대상 문서에 붙여넣기
    destDoc.activate();
    app.executeMenuCommand("pasteInPlace");

    var sel = destDoc.selection;
    if (!sel || sel.length === 0) return;

    // 4) 붙여넣어진 앵커를 찾아서 좌상단 기준으로 정렬
    var i, pastedAnchor = null;
    for (i = 0; i < sel.length; i++) {
      if (sel[i].name === anchorName) { pastedAnchor = sel[i]; break; }
    }
    if (!pastedAnchor) {
      // 혹시 selection이 풀렸다면 다시 찾아보기
      var all = destDoc.pageItems;
      for (i = 0; i < all.length; i++) {
        if (all[i].name === anchorName) { pastedAnchor = all[i]; break; }
      }
    }
    if (!pastedAnchor) return; // 안전빵

    var gb = pastedAnchor.geometricBounds; // [L,T,R,B] (stroke/효과 영향 없음)
    var L = gb[0], T = gb[1];

    var dx = toX    - L;
    var dy = toTopY - T;

    // 5) 전체를 동일하게 이동
    for (i = 0; i < sel.length; i++) sel[i].translate(dx, dy);

    // 6) 앵커는 삭제
    try { pastedAnchor.remove(); } catch(e) {}

    app.executeMenuCommand("deselectall");
  }





  /* ── 3) 2-열(한 행에 2개) 배치 ---------------------------------- */
  var col1X = 0;                 // 왼쪽 열 시작 X
  var col2X = maxW1 + GAP_H;     // 오른쪽 열 시작 X
  var cursorY = 0;               // 누적 높이(위→아래)

  for (var idx = 0; idx < abTotal; idx += 2) {
    var w1 = widths[idx],  h1 = heights[idx];
    var w2 = (idx + 1 < abTotal) ? widths[idx + 1]  : 0;
    var h2 = (idx + 1 < abTotal) ? heights[idx + 1] : 0;
    var rowH = Math.max(h1, h2);

    var rowTopY = totalH - cursorY; // Illustrator 좌표계 상단 T

    // 열 내부 가운데 정렬: (열 최대폭 - 실제폭)/2 만큼 안쪽으로
    var x1 = col1X + (maxW1 - w1) / 2;
    pasteBoard(idx, comp, x1, rowTopY);

    if (idx + 1 < abTotal) {
      var x2 = col2X + (maxW2 - w2) / 2;
      pasteBoard(idx + 1, comp, x2, rowTopY);
    }

    cursorY += rowH + GAP_V;
  }

  /* ── 4) JPG 내보내기 ------------------------------------------- */
  var jpgOpt = new ExportOptionsJPEG();
  jpgOpt.qualitySetting   = 100;
  jpgOpt.resolution       = 600;
  jpgOpt.horizontalScale  = jpgOpt.verticalScale = 100;
  jpgOpt.optimized        = true;
  jpgOpt.antiAliasing     = true;
  jpgOpt.artBoardClipping = false;

  var outFolder = doc.fullName.parent;
  var stem      = baseName; // 필요시 "_사원증" 등 접미사 추가 가능
  var outFile   = new File(outFolder + "/" + stem + ".jpg");
  var dup = 0;
  while (outFile.exists) outFile = new File(outFolder + "/" + stem + "_" + (++dup) + ".jpg");

  comp.exportFile(outFile, ExportType.JPEG, jpgOpt);
  comp.close(SaveOptions.DONOTSAVECHANGES);
})();
