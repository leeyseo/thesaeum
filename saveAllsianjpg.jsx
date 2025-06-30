/* ─────────────────── 2-열×10-행 전체 JPG (배경 ‘이미지’ 먼저, 디자인 나중) ───────────────────
   1. baseName → 〈사이즈_색상〉(예: 70x20_골드) 추출 (+‘엣지_’ 접두사) →
      C:\work\img\<키>.png|jpg 를 찾음
   2. ① **모든 셀에 이미지**(배경) 먼저 배치
      ② **그다음** ‘출력_디자인’ 레이어 디자인을 같은 셀 좌표에 복제해 올림
   3. 셀 배치: 가로 2열(COL_PAIR), 세로 10행(ROW_MAX) 단위로 아래→오른쪽으로 확장
   4. 각 디자인의 “전체 배경 사각형”은 fillColor = NoColor
   5. GAP = 10 pt 고정
   6. 결과 JPG: C:\work\<날짜-번호>\jpg\<기준이름>_전체시안_<범위>.jpg
   ─────────────────────────────────────────────────────────────────────────── */
(function () {

  /* ── 0) 문서 검사 ── */
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* ── 1) 사용자 입력 ── */
  var baseName = prompt("저장할 기준 파일명을 입력하세요:\n(예: 엣지 명찰_70x20_골드_옷핀+집게_..._20250627-0000182)", "");
  if (!baseName) return;
  var rangeInput = prompt("아트보드 범위를 입력하세요 (예: 1-30 또는 15)", "");
  if (!rangeInput) return;

  /* 1-a) baseName → imgKey & folderId */
  var toks = baseName.split("_");
  var imgKey = (toks.length >= 3) ? toks[1] + "_" + toks[2] : "";
  if (toks[0].indexOf("엣지") !== -1) imgKey = "엣지_" + imgKey;
  var imgFile = null;
  var tryPng = new File("C:/work/img/" + imgKey + ".png");
  var tryJpg = new File("C:/work/img/" + imgKey + ".jpg");
  if      (tryPng.exists) imgFile = tryPng;
  else if (tryJpg.exists) imgFile = tryJpg;   // 없으면 null → 이미지 생략

  var m = baseName.match(/_([0-9]{8}-[0-9]{7})$/);
  if (!m) { alert("❌ 파일명에 '_YYYYMMDD-#######' 형식이 없습니다."); return; }
  var folderId = m[1];

  /* 1-b) 범위 파싱 */
  if (/^\d+$/.test(rangeInput)) rangeInput = "1-" + rangeInput;
  var r = rangeInput.split("-");
  if (r.length !== 2) { alert("❌ 범위는 '1-30' 형식"); return; }
  var startIdx = parseInt(r[0], 10) - 1,
      endIdx   = parseInt(r[1], 10) - 1,
      maxIdx   = doc.artboards.length - 1;
  if (isNaN(startIdx) || isNaN(endIdx) || startIdx < 0) { alert("❌ 잘못된 범위"); return; }
  endIdx = Math.min(endIdx, maxIdx);
  if (startIdx > endIdx) { alert("❌ 시작번호가 끝번호보다 큼"); return; }
  var actualRange = (startIdx + 1) + "-" + (endIdx + 1);

  /* ── 2) 레이어 준비 ── */
  var srcLayer;
  try { srcLayer = doc.layers.getByName("출력_디자인"); }
  catch(e){ alert("❌ ‘출력_디자인’ 레이어 없음"); return; }

  var visMap = {};
  for (var i = 0; i < doc.layers.length; i++) { visMap[doc.layers[i].name] = doc.layers[i].visible; }
  srcLayer.visible = true;

  /* 2-a) 배경이미지 전용 레이어 */
  var imgLayer;
  try { imgLayer = doc.layers.getByName("TEMP_IMG_LAYER"); imgLayer.pageItems.length = 0; }
  catch(e){ imgLayer = doc.layers.add(); imgLayer.name = "TEMP_IMG_LAYER"; }
  imgLayer.visible = true;

  /* 2-b) 디자인 복제 레이어 */
  var designLayer;
  try { designLayer = doc.layers.getByName("TEMP_EXPORT_LAYER"); designLayer.pageItems.length = 0; }
  catch(e){ designLayer = doc.layers.add(); designLayer.name = "TEMP_EXPORT_LAYER"; }
  designLayer.visible = true;

  /* ── 3) 공통 치수 ── */
  var ab0 = doc.artboards[0].artboardRect;
  var ABW = ab0[2] - ab0[0],
      ABH = ab0[1] - ab0[3],
      GAP = 10,       COL_PAIR = 2, ROW_MAX = 10,
      TOL = Math.max(4, ABW * 0.05),
      noFill = new NoColor();

  /* 문서 우측 빈 공간 시작 X */
  var maxRight = -Infinity;
  for (i = 0; i < doc.artboards.length; i++) {
    var rc = doc.artboards[i].artboardRect;
    if (rc[2] > maxRight) maxRight = rc[2];
  }
  var ORIGIN_X = maxRight + 500;

  /* ── 4) 셀 위치 계산 함수 ── */
  function cellXY(n) {
    var sub = n % COL_PAIR;
    var row = Math.floor(n / COL_PAIR) % ROW_MAX;
    var grp = Math.floor(n / (COL_PAIR * ROW_MAX));
    var col = grp * COL_PAIR + sub;
    return {
      x: ORIGIN_X + col * (ABW + GAP),
      y: -row * (ABH + GAP),
      col: col,
      row: row
    };
  }

  /* ── 5) 이미지(배경) 먼저 배치 ── */
  if (imgFile && imgFile.exists) {
    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
    var idxCnt = 0, maxCol = -1, maxRow = -1;
    for (var iAB = startIdx; iAB <= endIdx; iAB++) {
      var pos = cellXY(idxCnt);
      var pl = imgLayer.placedItems.add();
      pl.file = imgFile;
      /* 비율 맞춰 리사이즈 */
      var sx = 100 * (ABW  / pl.width);
      var sy = 100 * (ABH  / pl.height);
      pl.resize(sx, sy);
      /* 좌상단 맞추기 */
      pl.left = pos.x;
      pl.top  = pos.y;

      if (pos.col > maxCol) maxCol = pos.col;
      if (pos.row > maxRow) maxRow = pos.row;
      idxCnt++;
    }
  }

  /* ── 6) 디자인 복제 & 배치 ── */
  function intersects(b1,b2){return(b1[2]>b2[0])&&(b1[0]<b2[2])&&(b1[1]>b2[3])&&(b1[3]<b2[1]);}
  function collect(layer,rect,arr){
    for(var k=0;k<layer.pageItems.length;k++){
      var it=layer.pageItems[k]; if(it.hidden)continue;
      if(intersects(it.geometricBounds,rect))arr.push(it);
    }
    for(k=0;k<layer.layers.length;k++){ collect(layer.layers[k],rect,arr); }
  }
  function clearBg(g){
    var its=g.pageItems; for(var p=0;p<its.length;p++){
      var it=its[p];
      if((it.typename==="PathItem"||it.typename==="CompoundPathItem")&&it.filled){
        var b=it.geometricBounds, w=b[2]-b[0], h=b[1]-b[3];
        if(Math.abs(w-ABW)<=TOL && Math.abs(h-ABH)<=TOL){ try{it.fillColor=noFill;}catch(e){} }
      }
    }
  }

  app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
  var cnt=0, mCol=-1, mRow=-1;
  for(var ai=startIdx; ai<=endIdx; ai++){
    var rect=doc.artboards[ai].artboardRect, arr=[];
    collect(srcLayer,rect,arr); if(arr.length===0){cnt++; continue;}

    var grp=designLayer.groupItems.add();
    for(var j=0;j<arr.length;j++){
      var dup=arr[j].duplicate(designLayer,ElementPlacement.PLACEATEND);
      dup.moveToBeginning(grp);
    }
    clearBg(grp);

    var p=cellXY(cnt);
    var gb=grp.visibleBounds;
    grp.translate(p.x - gb[0], p.y - gb[1]);

    if(p.col>mCol)mCol=p.col; if(p.row>mRow)mRow=p.row;
    cnt++;
  }

  if(cnt===0){ alert("❌ 복제할 디자인 없음"); return; }

  /* ── 7) exportAB & JPG ── */
  var totCols=mCol+1, totRows=mRow+1,
      totW= totCols*ABW + (totCols-1)*GAP,
      totH= totRows*ABH + (totRows-1)*GAP;

  var expAB=doc.artboards.add([ORIGIN_X,0, ORIGIN_X+totW, -totH]);
  var expIdx=doc.artboards.length-1;

  var outDir=new Folder("C:/work/"+folderId+"/jpg"); if(!outDir.exists) outDir.create();
  var outFile=new File(outDir.fsName+"/"+baseName+"_전체시안_"+actualRange+".jpg");

  var jpg=new ExportOptionsJPEG(); jpg.artBoardClipping=true; jpg.antiAliasing=true;
  jpg.qualitySetting=100; jpg.horizontalScale=100; jpg.verticalScale=100; jpg.optimization=true;

  doc.artboards.setActiveArtboardIndex(expIdx);
  doc.exportFile(outFile,ExportType.JPEG,jpg);

  /* ── 8) 레이어 가시성 복구 ── */
  for(var n in visMap){ try{ doc.layers.getByName(n).visible=visMap[n]; }catch(e){} }
  imgLayer.visible=true; designLayer.visible=true;

  doc.artboards.remove(expIdx);
  // alert("✅ JPG 저장 완료!\n"+outFile.fsName);

})();
