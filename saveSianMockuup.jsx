/**
 * 0 ·1 / 2 ·3 … 식으로 붙이거나
 * 아트보드별 단독 JPG를 같은 폴더에 저장
 *
 * ⚠︎ AI 파일은 따로 저장하지 않습니다
 */
(function () {

  /* 0) 문서 검사 -------------------------------------------------- */
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc      = app.activeDocument;
  var numAB    = doc.artboards.length;
  if (numAB === 0) { alert("아트보드가 없습니다."); return; }

  /* 1) 기본 정보 --------------------------------------------------- */
  var docPath  = doc.fullName.parent;     // 저장 경로 = 현재 .ai 폴더
  var baseName = decodeURI(doc.name).replace(/\.ai$/i, ""); // .ai 이름
  var isCard   = (baseName.indexOf("사원증") !== -1);        // “사원증” 여부
  var GAP_PT   = 10;     // 앞·뒤 간격(pt)

  /* 2) 공통 JPG 옵션 ---------------------------------------------- */
  var jpgOpt = new ExportOptionsJPEG();
  jpgOpt.qualitySetting   = 100;
  jpgOpt.resolution       = 600;
  jpgOpt.horizontalScale  = jpgOpt.verticalScale = 100;
  jpgOpt.optimized        = true;
  jpgOpt.antiAliasing     = true;
  jpgOpt.artBoardClipping = false;   // 새 문서 전체 저장

  /* 3-A) 사원증이 “아닌” 경우 : 아트보드마다 1장 -------------------- */
  if (!isCard) {

    for (var i = 0; i < numAB; i++) {
      doc.artboards.setActiveArtboardIndex(i);
      app.executeMenuCommand("deselectall");

      var stem = baseName + "(" + (i + 1) + ")";
      var out  = new File(docPath + "/" + stem + ".jpg");
      var d = 0;
      while (out.exists) out = new File(docPath + "/" + stem + "_" + (++d) + ".jpg");

      doc.exportFile(out, ExportType.JPEG, jpgOpt);
    }
    return;
  }

  /* 3-B) 사원증인 경우 : 연속 2면 묶음 ------------------------------ */

  /* 보조 : 아트보드 srcIdx를 tmpDoc으로 복사 후 (x,y) 맞춤 */
  function pasteBoard(srcIdx, tmpDoc, toX, toTopY)
  {
    doc.activate();
    doc.artboards.setActiveArtboardIndex(srcIdx);
    app.executeMenuCommand("deselectall");
    doc.selectObjectsOnActiveArtboard();
    app.copy();

    tmpDoc.activate();
    app.executeMenuCommand("pasteInPlace");

    /* 선택 전체 바운드 */
    var sel = tmpDoc.selection;
    var L =  1e10, T = -1e10, R = -1e10, B =  1e10;
    for (var s = 0; s < sel.length; s++) {
      var vb = sel[s].visibleBounds;      // [L,T,R,B]
      if (vb[0] < L) L = vb[0];
      if (vb[1] > T) T = vb[1];
      if (vb[2] > R) R = vb[2];
      if (vb[3] < B) B = vb[3];
    }
    var dx = toX  - L;
    var dy = toTopY - T;
    for (var s = 0; s < sel.length; s++) sel[s].translate(dx, dy);
    app.executeMenuCommand("deselectall");
    return [L + dx, T + dy, R + dx, B + dy];     // 이동 후 [L,T,R,B]
  }

  var pairNo = 1;
  for (var i = 0; i < numAB; i += 2, pairNo++) {

    /* 앞면 크기 */
    var ab1 = doc.artboards[i].artboardRect;
    var w1  = ab1[2] - ab1[0],  h1 = ab1[1] - ab1[3];

    /* 뒷면 크기 (있을 때) */
    var hasBack = (i + 1 < numAB);
    var w2 = 0, h2 = 0, ab2 = null;
    if (hasBack) {
      ab2 = doc.artboards[i + 1].artboardRect;
      w2  = ab2[2] - ab2[0];  h2 = ab2[1] - ab2[3];
    }

    /* 새 문서 크기 */
    var newW = w1 + (hasBack ? GAP_PT + w2 : 0);
    var newH = (h1 > h2) ? h1 : h2;

    var tmp = app.documents.add(DocumentColorSpace.RGB, newW, newH);
    tmp.artboards[0].artboardRect = [0, newH, newW, 0];

    /* 앞·뒤 붙여넣기 */
    var vb1 = pasteBoard(i, tmp, 0, newH);
    if (hasBack) pasteBoard(i + 1, tmp, vb1[2] + GAP_PT, newH);

    /* 파일명 & 중복 처리 */
    var stem = baseName + "(" + pairNo + ")";
    var out  = new File(docPath + "/" + stem + ".jpg");
    var d = 0;
    while (out.exists) out = new File(docPath + "/" + stem + "_" + (++d) + ".jpg");

    tmp.exportFile(out, ExportType.JPEG, jpgOpt);
    tmp.close(SaveOptions.DONOTSAVECHANGES);
  }

})();
