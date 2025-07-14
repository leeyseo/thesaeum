(function () {
  /* 0) 문서 확인 */
  if (app.documents.length === 0) {
    alert("문서가 없습니다.");
    return;
  }
  var doc = app.activeDocument;

  /* 1) 사용자 입력 */
  var input = prompt(
    "저장용 전체 이름을 입력하세요:\n" +
    "(예: UV 명찰_70x25_골드_옷핀+집게_재제작_정근진_4_20250626-0000190)",
    ""
  );
  if (!input) return;

  /* 2) 날짜-번호(폴더명) 추출 */
  var m = input.match(/_([0-9]{8}-[0-9]{7}(?:-\d+)?)/);
  if (!m) {
    alert("❌ '_날짜-번호' 형식을 찾을 수 없습니다.");
    return;
  }
  var numFolder = m[1];  // 예: 20250626-0000190

  /* 3) 저장 폴더 생성 */
  var root = new Folder("C:/work");
  if (!root.exists) root.create();

  var projRoot = new Folder(root.fsName + "/" + numFolder);
  if (!projRoot.exists) projRoot.create();

  // 📁 Sian 폴더 자동 생성: Sian1, Sian2, ...
  var saveDir = null;
  var sianIdx = 0;
  for (var i = 1; i <= 99; i++) {
    var tryDir = new Folder(projRoot.fsName + "/Sian" + i);
    if (!tryDir.exists) {
      tryDir.create();
      saveDir = tryDir;
      sianIdx = i;
      break;
    }
  }
  if (saveDir == null) {
    alert("❌ Sian1~Sian99까지 폴더가 모두 존재합니다.");
    return;
  }

  /* 4) 파일명 구성: 폴더 이름에 따라 _번호 붙이기 */
  var baseName = input + "_" + sianIdx;
  var idx = 0;
  var aiFile = new File(saveDir.fsName + "/" + baseName + ".ai");
  while (aiFile.exists) {
    idx++;
    aiFile = new File(saveDir.fsName + "/" + baseName + "_" + idx + ".ai");
  }

  /* 5) 저장 옵션 & 저장 */
  var opts = new IllustratorSaveOptions();
  opts.compatibility = Compatibility.ILLUSTRATOR17;
  opts.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;

  doc.saveAs(aiFile, opts);

// /* 6) JPG 저장 ────────────────────────────────────────────────
//    - ‘사원증’이 **없으면**  → 아트보드 1개당 JPG 1장
//    - ‘사원증’이 **있으면** → 아트보드 2개(앞·뒤)를 좌→우로 붙여 JPG 1장
//      0·1 / 2·3 / …  (마지막이 홀수면 앞면만)
//   ----------------------------------------------------------------*/
//   var isCard = (input.indexOf("사원증") !== -1);   // ‘사원증’ 포함 여부
//   var GAP=10;

//   /* 공통 JPG 옵션 */
//   var jpgOpt = new ExportOptionsJPEG();
//   jpgOpt.qualitySetting   = 100;
//   jpgOpt.resolution       = 600;
//   jpgOpt.horizontalScale  = jpgOpt.verticalScale = 100;
//   jpgOpt.antiAliasing     = true;
//   jpgOpt.optimized        = true;
//   jpgOpt.artBoardClipping = false;   // 새 문서 전체를 저장

//   /* ───────── ① 사원증이 **아닌** 경우 ───────── */
//   if (!isCard) {

//     for (var i = 0; i < doc.artboards.length; i++) {
//       doc.artboards.setActiveArtboardIndex(i);
//       app.executeMenuCommand("deselectall");

//       var stem = baseName + "(" + (i + 1) + ")";
//       var out  = new File(saveDir.fsName + "/" + stem + ".jpg");
//       var d = 0;
//       while (out.exists) out = new File(saveDir.fsName + "/" + stem + "_" + (++d) + ".jpg");

//       doc.exportFile(out, ExportType.JPEG, jpgOpt);
//     }
//   }

//   /* ───────── ② ‘사원증’일 때: 2면 묶음 ───────── */
//   else {

//     /* ▸ 아트보드 하나를 새 문서 tmpDoc으로 복사 & (toX,toTopY) 맞춤 */
//     function pasteBoard(srcIdx, tmpDoc, toX, toTopY) {
//       doc.activate();
//       doc.artboards.setActiveArtboardIndex(srcIdx);
//       app.executeMenuCommand("deselectall");
//       doc.selectObjectsOnActiveArtboard();
//       app.copy();

//       tmpDoc.activate();
//       app.executeMenuCommand("pasteInPlace");

//       /* 선택된 전체 바운드 계산 */
//       var sel = tmpDoc.selection;
//       var L =  1e10, T = -1e10, R = -1e10, B =  1e10;
//       for (var s = 0; s < sel.length; s++) {
//         var vb = sel[s].visibleBounds;   // [L,T,R,B]
//         if (vb[0] < L) L = vb[0];
//         if (vb[1] > T) T = vb[1];
//         if (vb[2] > R) R = vb[2];
//         if (vb[3] < B) B = vb[3];
//       }

//       /* 그룹 전체 평행이동 → 좌상단을 정확히 (toX,toTopY)에 맞춤 */
//       var dx = toX    - L;
//       var dy = toTopY - T;
//       for (var s = 0; s < sel.length; s++) sel[s].translate(dx, dy);

//       app.executeMenuCommand("deselectall");
//       return [L + dx, T + dy, R + dx, B + dy];   // 이동 후 [L,T,R,B]
//     }

//     var GAP_PT = GAP;      // 앞·뒤 간격(pt) — 상단 설정값 그대로 사용
//     var pairNo = 1;        // (1), (2), … 번호

//     for (var i = 0; i < doc.artboards.length; i += 2, pairNo++) {

//       /* 앞면 크기 */
//       var ab1 = doc.artboards[i].artboardRect;
//       var w1  = ab1[2] - ab1[0],  h1 = ab1[1] - ab1[3];

//       /* 뒷면 크기 (있을 때) */
//       var hasB = (i + 1 < doc.artboards.length);
//       var w2 = 0, h2 = 0, ab2 = null;
//       if (hasB) {
//         ab2 = doc.artboards[i + 1].artboardRect;
//         w2  = ab2[2] - ab2[0];  h2 = ab2[1] - ab2[3];
//       }

//       /* 새 문서 크기 = 앞 + GAP + 뒤  /  높이 = 둘 중 큰 값 */
//       var newW = w1 + (hasB ? GAP_PT + w2 : 0);
//       var newH = (h1 > h2) ? h1 : h2;

//       var tmp = app.documents.add(DocumentColorSpace.RGB, newW, newH);
//       tmp.artboards[0].artboardRect = [0, newH, newW, 0];

//       /* 앞면 붙이기 (좌상단) */
//       var vb1 = pasteBoard(i, tmp, 0, newH);

//       /* 뒷면 붙이기 (앞면 우측 + GAP) */
//       if (hasB) pasteBoard(i + 1, tmp, vb1[2] + GAP_PT, newH);

//       /* 파일명 & 중복 체크 */
//       var stem = baseName + "(" + pairNo + ")";
//       var out  = new File(saveDir.fsName + "/" + stem + ".jpg");
//       var d = 0;
//       while (out.exists) out = new File(saveDir.fsName + "/" + stem + "_" + (++d) + ".jpg");

//       tmp.exportFile(out, ExportType.JPEG, jpgOpt);
//       tmp.close(SaveOptions.DONOTSAVECHANGES);
//     }
//   }
  // alert("✅ 저장 완료: " + aiFile.fsName);
})();
