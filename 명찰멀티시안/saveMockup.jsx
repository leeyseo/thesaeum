(function () {
  /* ─── JPG 3종 + 주문번호·고객명 텍스트 (좌표 지정) ─────────────────────────────── */

  /* 0) 문서 검사 */
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* 1) 입력 */
  // var input = prompt(
  //   "저장용 전체 이름 입력:\n(예: 엣지 명찰_70x20_골드_옷핀+집게_CW 청원케딜락_1_20250623-0001503)",
  //   ""
  // );
  // if (!input) return;
  var fullName = decodeURI(doc.name).replace(/\.ai$/i, "");
  var match = fullName.match(/^(.*?_\d{8}-\d{7}(?:-\d+)?)/);
  if (!match) {
    alert("❌ 파일명에서 '_YYYYMMDD-#######' 형식을 찾을 수 없습니다.");
    return;
  }
  var input = match[1];  // ← 여기까지 자른 결과만 사용됨
  

  var baseOrig = input;                    // 표시용(공백 포함)
  var basePath = input.replace(/ /g, "-"); // 경로·파일명용
  /* ❶ ‘뱃지’ 여부에 따라 허용 필드 수가 다름 */


  var parts = baseOrig.split("_");

  var isBadge = parts[0].indexOf("뱃지") !== -1;
  /* ❷ 형식 검사 */
  if ( (!isBadge && parts.length < 7) ||   // 일반 = 7필드 이상
      ( isBadge && parts.length < 6) ) {  // 뱃지 = 6필드 이상
    alert("❌ 입력 형식 오류"); return;
  }
  /* ❸ 필드 해석 */
  if(isBadge){var orderNo  = parts[ parts.length - 1 ];   }else{
    var orderNo  = parts[6];  
  }



  // var orderNo  = parts[6];                        // 20250623-0001503
  // var customer = parts[4];                        // CW 청원케딜락
  var imgKey   = (parts[0].indexOf("엣지") !== -1 ? "엣지_" : "") +
                 parts[1] + "_" + parts[2];       // 배경키

  /* 배경 이미지 & 목업 */
  var bgImg  = new File("C:/work/img/" + imgKey + ".png");
  if (!bgImg.exists) { alert("❌ 배경 이미지 없음:\n" + bgImg.fsName); return; }
  var mockBg = new File("C:/work/img/목업.png");
  if (!mockBg.exists) { alert("❌ 목업 이미지 없음:\n" + mockBg.fsName); return; }

  /* 출력 폴더 */
  var outDir = new Folder("C:/work/" + orderNo);
  if (!outDir.exists) outDir.create();
  function uniq(name){
    var f = new File(outDir + "/" + name + ".jpg"), n = 0;
    while (f.exists) { n++; f = new File(outDir + "/" + name + "_" + n + ".jpg"); }
    return f;
  }


  /* 중복번호(_숫자) 찾기 ───────────────────────── */
  function getDupTag(folder, baseName) {
    // baseName 예: "엣지 명찰_70x20_실버_자석3구_KPA대한약사회_1_20250622-5555555"
    var maxDup  = 0;
    var aiFiles = folder.getFiles("*.ai");   // 폴더 안 *.ai 모두

    for (var i = 0; i < aiFiles.length; i++) {
      var nm = decodeURI(aiFiles[i].name);   // 한글·공백 복원
      nm = nm.replace(/\.ai$/i, "");         // 확장자 제거

      // ① baseName 과 완전히 같은 파일 ⇒ 중복번호 0 (건너뜀)
      if (nm === baseName) continue;

      // ② "<baseName>_<숫자>" 패턴만 추출
      if (nm.lastIndexOf(baseName + "_", 0) === 0) { // prefix 일치?
        var tail = nm.slice(baseName.length + 1);    // '_' 뒤
        if (/^\d+$/.test(tail)) {                    // 순수 숫자?
          var n = parseInt(tail, 10);
          if (n > maxDup) maxDup = n;                // 최대값 갱신
        }
      }
    }

    // 0 → "" , 1↑ → "_<숫자>"
    return (maxDup > 0) ? "_" + maxDup : "";
  }


  /* 사용 */
  var dupTag = getDupTag(outDir, baseOrig);  // "(1)" 또는 ""
  // alert(dupTag);

  // var siAnFile = uniq(basePath  + "_시안전송용"+ dupTag);
  var siAnFile = new File(Folder.temp + "/__siAn__.jpg");
  var hwakFile = uniq(basePath+ dupTag  + "_확정형");
  var mockFile = uniq(basePath+ dupTag  + "_시안전송목업용");

  /* 2) 전경 PNG (배경 투명) */
  doc.artboards.setActiveArtboardIndex(0);
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard();

  var ab = doc.artboards[0].artboardRect, AW = ab[2] - ab[0], AH = ab[1] - ab[3],
      tol = Math.max(10, AW * 0.02), sel = doc.selection;
  for (var i = 0; i < sel.length; i++) {
    var it = sel[i];
    if (it.typename === "PathItem" && it.filled) {
      var b = it.geometricBounds, w = b[2] - b[0], h = b[1] - b[3];
      if (Math.abs(w - AW) <= tol && Math.abs(h - AH) <= tol) it.fillColor = new NoColor();
    }
  }
  var tmpPng = new File(Folder.temp + "/__tmp_fg__.png");
  var pOpt = new ExportOptionsPNG24();
  pOpt.transparency = true; pOpt.antiAliasing = true; pOpt.artBoardClipping = true;
  pOpt.horizontalScale = pOpt.verticalScale = 300;     // 300% (≈ 900 ppi)
  doc.exportFile(tmpPng, ExportType.PNG24, pOpt);

  /* 공통 JPG 옵션 */
  var jOpt = new ExportOptionsJPEG();
  jOpt.qualitySetting = 100; jOpt.resolution = 600;
  jOpt.resolution      = isBadge ? 1200 : 600;
  jOpt.horizontalScale = jOpt.verticalScale = 100;
  jOpt.antiAliasing = true; jOpt.optimized = true; jOpt.artBoardClipping = true;

  /* 3) 합성 함수 (Multiply Blend) */
  function composite(bg, fg, out, ratio, yShift,
                     txt1, off1, txt2, off2, font){
    if (ratio == null)  ratio = 1;
    if (yShift == null) yShift = 0;

    // 새 문서 (배경 크기에 맞춤)
    var nd = app.documents.add(DocumentColorSpace.RGB, 2000, 1000);
    var b  = nd.placedItems.add();
    var f  = nd.placedItems.add();

    b.file = bg; f.file = fg; app.redraw();

    // BlendMode "Multiply" 적용 ▶︎ 곱하기 효과
    f.blendingMode = BlendModes.MULTIPLY;

    // 배경을 좌상단 (0,0) → 하단(+,−) 좌표로 맞춤
    b.position = [0, b.height];
    var W = b.width, H = b.height;
    nd.artboards[0].artboardRect = [0, H, W, 0];

    // 전경 스케일 & 위치
    var sPct = (W * ratio / f.width) * 98;
    f.resize(sPct, sPct);
    var spare = H - f.height;
    f.position = [(W - f.width) / 2, H - (spare / 2) - (spare * yShift)];

    // 텍스트 (옵션)
    var black = new RGBColor(); black.red = black.green = black.blue = 0;
    function putText(txt, off, sz){
      if (!txt || !off) return;
      var t = nd.textFrames.add(); t.contents = txt;
      var ft = null;
      if (font) {
        try { ft = app.textFonts.getByName(font); } catch (e) {}
      }
      if (!ft) ft = app.textFonts[0];
      t.textRange.characterAttributes.textFont = ft;
      t.textRange.characterAttributes.size = sz || 40;
      t.textRange.characterAttributes.fillColor = black;
      t.position = [off[0], H - off[1]];   // 좌상단 기준
    }
    putText(txt1, off1, 40);
    putText(txt2, off2, 40);

    // ▶︎ JPG 내보내기
    nd.exportFile(out, ExportType.JPEG, jOpt);
    nd.close(SaveOptions.DONOTSAVECHANGES);
  }

  /* 4) 시안전송용 (배경 × 전경 PNG, Multiply) */
  composite(bgImg, tmpPng, siAnFile, 1, 0.1, null, null, null, null, "GmarketSans");

  /* 5) 확정형 (이름 치환) */
  var finalName = "홍길동";   // ← 필요시 prompt 로 변경

  // 새 문서 (원본 아트보드와 동일 크기)
  var ab2 = doc.artboards[0].artboardRect;
  var AW2 = ab2[2] - ab2[0], AH2 = ab2[1] - ab2[3];
  var tempDoc = app.documents.add(DocumentColorSpace.RGB, AW2, AH2);
  tempDoc.artboards[0].artboardRect = [0, AH2, AW2, 0];

  // 복사 & 붙여넣기
  doc.activate(); doc.artboards.setActiveArtboardIndex(0);
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard(); app.copy();
  tempDoc.activate(); app.paste();

  // 텍스트 치환 (이름_* 변수)
  function replaceNameIn(container){
    for (var i = 0; i < container.pageItems.length; i++){
      var item = container.pageItems[i];
      if (item.typename === "GroupItem") replaceNameIn(item);
      else if (item.typename === "TextFrame") {
        if (item.name && item.name.indexOf("이름") !== -1) {
          item.contents = finalName;
        }
      }
    }
  }
  replaceNameIn(tempDoc);

  // JPG 저장
  tempDoc.exportFile(hwakFile, ExportType.JPEG, jOpt);
  tempDoc.close(SaveOptions.DONOTSAVECHANGES);

  /* 6) 시안전송 목업용 (시안전송용 JPG + 목업 배경) */
  var userText = prompt("시안전송 목업 JPG에 넣을 텍스트를 입력하세요:", "");
  if (userText === null) userText = "";

  var nd = app.documents.add(DocumentColorSpace.RGB, 2000, 1000);
  var b = nd.placedItems.add();
  var f = nd.placedItems.add();
  b.file = mockBg; f.file = siAnFile; app.redraw();

  b.position = [0, b.height];
  var Wm = b.width, Hm = b.height;
  nd.artboards[0].artboardRect = [0, Hm, Wm, 0];

  var frontRatio = isBadge ? 0.3 : 0.60;
  var sPctM = (Wm * frontRatio / f.width) * 100;
  f.resize(sPctM, sPctM);
  var spareM = Hm - f.height;
  f.position = [(Wm - f.width) / 2, Hm - (spareM / 2) - (spareM * 0.1)];

  // 텍스트 입력 (중앙 정렬, 빨간색)
  if (userText !== "") {
    var tf = nd.textFrames.areaText(nd.pathItems.rectangle(Hm - 900, 260, 1000, 120));
    tf.contents = userText;
    var red = new RGBColor(); red.red = 255; red.green = 0; red.blue = 0;
    tf.textRange.characterAttributes.fillColor = red;
    tf.textRange.characterAttributes.size = 36;
    try {
      tf.textRange.characterAttributes.textFont = app.textFonts.getByName("GmarketSans");
    } catch (e) {
      tf.textRange.characterAttributes.textFont = app.textFonts[0];
    }
    tf.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;
  }

  nd.exportFile(mockFile, ExportType.JPEG, jOpt);
  nd.close(SaveOptions.DONOTSAVECHANGES);

  /* 7) 임시 PNG 삭제 & 종료 */
  try { tmpPng.remove(); } catch (e) {}
  try { siAnFile.remove(); } catch (e) {}
  // alert("✅ JPG 3종 저장 완료 (Multiply 반영)");

})();
