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
  alert(baseName);
  var GAP_PT   = 10;          // 아트보드 간격

  /* ── 1) 각 아트보드 크기 수집 ---------------------------------- */
  var widths  = [], heights = [];
  for (var i = 0; i < abTotal; i++) {
    var ab = doc.artboards[i].artboardRect;     // [L,T,R,B]
    widths.push( ab[2] - ab[0] );
    heights.push( ab[1] - ab[3] );
  }
  var maxW   = Math.max.apply(null, widths);
  var totalH = 0;
  for (var h = 0; h < heights.length; h++) {
    totalH += heights[h];
    if (h < heights.length - 1) totalH += GAP_PT;
  }

  /* ── 2) 새 문서 생성 ------------------------------------------- */
  var comp = app.documents.add(DocumentColorSpace.RGB, maxW, totalH);
  comp.artboards[0].artboardRect = [0, totalH, maxW, 0];

  /* 복사‑붙여넣기 & 위치 맞추기 */
  function pasteBoard(srcIdx, destDoc, toX, toTopY) {
    doc.activate();
    doc.artboards.setActiveArtboardIndex(srcIdx);
    app.executeMenuCommand("deselectall");
    doc.selectObjectsOnActiveArtboard();
    app.copy();

    destDoc.activate();
    app.executeMenuCommand("pasteInPlace");

    var sel = destDoc.selection;
    var L = 1e10, T = -1e10;
    for (var s = 0; s < sel.length; s++) {
      var vb = sel[s].visibleBounds;   // [L,T,R,B]
      if (vb[0] < L) L = vb[0];
      if (vb[1] > T) T = vb[1];
    }
    var dx = toX - L,
        dy = toTopY - T;
    for (var s = 0; s < sel.length; s++) sel[s].translate(dx, dy);
    app.executeMenuCommand("deselectall");
  }

  /* ── 3) 1 열 배치 ---------------------------------------------- */
  var cursorY = 0;                       // 누적 높이 (위→아래)
  for (var idx = 0; idx < abTotal; idx++) {
    var topY = totalH - cursorY;         // Illustrator 좌표계: 위쪽 T 값
    pasteBoard(idx, comp, 0, topY);
    cursorY += heights[idx] + GAP_PT;
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
  var stem      = baseName;
  var outFile   = new File(outFolder + "/" + stem + ".jpg");
  var dup = 0;
  while (outFile.exists) outFile = new File(outFolder + "/" + stem + "_" + (++dup) + ".jpg");

  comp.exportFile(outFile, ExportType.JPEG, jpgOpt);
  comp.close(SaveOptions.DONOTSAVECHANGES);

  // alert("✅ 모든 아트보드를 1 열로 배치한 JPG 저장 완료:\n" + decodeURI(outFile.fsName));
})();