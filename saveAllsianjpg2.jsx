(function () {
  /* ─────────────────── 0) 기본 검사 ─────────────────── */
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* ─────────────────── 1) 사용자 입력 ─────────────────── */
  var baseName = prompt("저장용 기준 파일명을 입력하세요:", "");
  if (!baseName) return;

  var bundleSize = parseInt(prompt("JPG 하나당 디자인 세트 개수? (예: 10)", "10"), 10);
  if (isNaN(bundleSize) || bundleSize <= 0) { alert("❌ 숫자를 올바르게 입력"); return; }

  /* 배경 파일 추적 (엣지 여부 + 사이즈_색상) */
  var toks   = baseName.split("_");
  var imgKey = (toks[0].indexOf("엣지") !== -1 ? "엣지_" : "") +
               (toks.length >= 3 ? toks[1] + "_" + toks[2] : "");
  var imgFile = (new File("C:/work/img/" + imgKey + ".png")).exists
                ? new File("C:/work/img/" + imgKey + ".png")
                : new File("C:/work/img/" + imgKey + ".jpg");

  /* 주문번호 = 파일명 맨 끝 "_YYYYMMDD-#######" 패턴 */
  var m = baseName.match(/_([0-9]{8}-[0-9]{7})$/);
  if (!m) { alert("❌ '_YYYYMMDD-#######' 형식 누락"); return; }
  var folderId = m[1];

  /* ─────────── 2) 레이어 / 좌표 기본값 ─────────── */
  var srcLayer;
  try { srcLayer = doc.layers.getByName("출력_디자인"); }
  catch (e) { alert("❌ ‘출력_디자인’ 레이어 없음"); return; }

  /* 원본 레이어 가시성 백업 */
  var visMap = {};
  for (var i = 0; i < doc.layers.length; i++)
    visMap[doc.layers[i].name] = doc.layers[i].visible;
  srcLayer.visible = true;

  function makeEmptyLayer(name) {
    var ly;
    try { ly = doc.layers.getByName(name); while (ly.pageItems.length) ly.pageItems[0].remove(); }
    catch (_) { ly = doc.layers.add(); ly.name = name; }
    ly.visible = true; return ly;
  }

  /* 아트보드·셀 치수 */
  var ab0  = doc.artboards[0].artboardRect,
      ABW  = ab0[2] - ab0[0],
      ABH  = ab0[1] - ab0[3];

  var INNER_GAP = 10;               // 앞↔뒤(세트 내부) 간격
  var GAP       = 20;               // 세트↔세트 간격
  var PAIR_W    = ABW * 2 + INNER_GAP;

  var COL_MAX   = 1;                // 한 행에 세트 5개(=10아트보드)까지
  var ROW_MAX   = 10;               // 필요하면 조정

  /* 시안 배치 시작 X (원본 우측 여백) */
  var rightMost = -Infinity;
  for (i = 0; i < doc.artboards.length; i++)
      if (doc.artboards[i].artboardRect[2] > rightMost)
          rightMost = doc.artboards[i].artboardRect[2];
  var ORIGIN_X = rightMost + 500;

  /* 셀 좌표 계산 */
  function cellXY(setIdx) {
    var col = setIdx % COL_MAX;
    var row = Math.floor(setIdx / COL_MAX);
    return { x: ORIGIN_X + col * (PAIR_W + GAP),
             y: -row    * (ABH   + GAP),
             col: col, row: row };
  }

  /* 간단 유틸 */
  function getNonConflictFile(base, ext){
    var f=new File(base+ext), n=1; while(f.exists){f=new File(base+"_"+n+ext);n++;} return f;}
  function rectHit(r1,r2){return(r1[2]>r2[0])&&(r1[0]<r2[2])&&(r1[1]>r2[3])&&(r1[3]<r2[1]);}
  function collect(layer,rect,arr){
    for(var k=0;k<layer.pageItems.length;k++){
      var it=layer.pageItems[k]; if(it.hidden)continue;
      if(rectHit(it.geometricBounds,rect))arr.push(it);}
    for(k=0;k<layer.layers.length;k++)collect(layer.layers[k],rect,arr);
  }
  var noFill=new NoColor();
  function clearBg(g){
    var tol=Math.max(4,ABW*0.05);
    for(var p=0;p<g.pageItems.length;p++){
      var it=g.pageItems[p];
      if((it.typename==="PathItem"||it.typename==="CompoundPathItem")&&it.filled){
        var b=it.geometricBounds,w=b[2]-b[0],h=b[1]-b[3];
        if(Math.abs(w-ABW)<=tol&&Math.abs(h-ABH)<=tol)try{it.fillColor=noFill;}catch(_){}}}}
  /* ─────────── 3) 세트·묶음 계산 ─────────── */
  var PER_SET     = 2;                               // 앞+뒤 = 2아트보드
  var totalSets   = Math.ceil(doc.artboards.length / PER_SET);
  var jpgBundles  = Math.ceil(totalSets / bundleSize);

  /* 출력 폴더 */
  var outDir = new Folder("C:/work/" + folderId); if (!outDir.exists) outDir.create();

  /* 공통 JPG 옵션 (뱃지면 해상도 ↑) */
  var isBadge = baseName.indexOf("뱃지") !== -1;
  var jpgOpt = new ExportOptionsJPEG();
  jpgOpt.qualitySetting = 100;
  jpgOpt.resolution     = isBadge ? 1200 : 600;
  jpgOpt.horizontalScale = jpgOpt.verticalScale = 100;
  jpgOpt.antiAliasing   = true;
  jpgOpt.optimized      = true;
  jpgOpt.artBoardClipping = true;

  /* ─────────── 4) 메인 루프 (묶음별) ─────────── */
  for (var part = 0; part < jpgBundles; part++) {

    var setStart = part * bundleSize;
    var setEnd   = Math.min(setStart + bundleSize - 1, totalSets - 1);

    var imgLayer     = makeEmptyLayer("TEMP_BG");
    var designLayer  = makeEmptyLayer("TEMP_FG");

    var maxCol=-1,maxRow=-1, setIdx=0;

    for (var s = setStart; s <= setEnd; s++, setIdx++) {

      var frontAB = s*PER_SET, backAB = frontAB+1;
      if (frontAB >= doc.artboards.length) break;

      var cell = cellXY(setIdx);

      /* 배경 둘(앞·뒤) */
      if (imgFile.exists) {
        var plF = imgLayer.placedItems.add(); plF.file = imgFile;
        plF.resize(100*(ABW/plF.width), 100*(ABH/plF.height));
        plF.left = cell.x;  plF.top = cell.y;

        var plB = plF.duplicate(imgLayer, ElementPlacement.PLACEATEND);
        plB.translate(ABW + INNER_GAP, 0);
      }

      /* 디자인 복제 함수 */
      function dupBoard(abIdx, dx){
        if(abIdx>=doc.artboards.length) return;
        var arr=[]; collect(srcLayer, doc.artboards[abIdx].artboardRect, arr);
        if(!arr.length) return;
        var g=designLayer.groupItems.add();
        for(var k=0;k<arr.length;k++) arr[k].duplicate(g,ElementPlacement.PLACEATEND);
        clearBg(g); g.blendingMode = BlendModes.MULTIPLY;
        var vb=g.visibleBounds; g.translate(cell.x+dx-vb[0], cell.y - vb[1]);
      }
      dupBoard(frontAB, 0);                          // 앞면(좌)
      dupBoard(backAB , ABW + INNER_GAP);            // 뒷면(우)

      if(cell.col>maxCol)maxCol=cell.col;
      if(cell.row>maxRow)maxRow=cell.row;
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

    /* 임시 출력용 아트보드 만들기 */
    var totCols=maxCol+1, totRows=maxRow+1;
    var totW=totCols*PAIR_W + (totCols-1)*GAP;
    var totH=totRows*ABH   + (totRows-1)*GAP;
    var expRect=[ORIGIN_X, 0, ORIGIN_X+totW, -totH];
    var expIdx = doc.artboards.add(expRect); expIdx = doc.artboards.length-1;

    /* 파일 저장 */
    doc.artboards.setActiveArtboardIndex(expIdx);
    // var clean = baseName.replace(/\s+/g,"");
    var dupTag = getDupTag(outDir, baseName);
    function uniqueJpg(base) {
      var safe = base.replace(/\s+/g, "-");
      var f   = new File(safe + ".jpg");
      var idx = 1;
      while (f.exists) {                     // 이미 있으면
        f = new File(base + "_" + idx + ".jpg");  // 뒤에 _1, _2 …
        idx++;
      }
      return f;                              // 존재하지 않는 File 객체
    }
    var baseP= outDir.fsName + "/" + baseName + dupTag  + "_전체시안(" + (part + 1) + ")";

    /* 3) 최종 저장 경로 */
    var outFile = uniqueJpg(baseP);        // ← 여기서 중복 해결

    // var outFile = getNonConflictFile(outDir.fsName + "/" + baseName + dupTag +"_전체시안("+(part+1)+")",".jpg");
    doc.exportFile(outFile, ExportType.JPEG, jpgOpt);

    /* 임시 아트보드 제거 */
    doc.artboards.remove(expIdx);
  }

  try { doc.layers.getByName("TEMP_BG").remove(); } catch(_){}
  try { doc.layers.getByName("TEMP_FG").remove(); } catch(_){}

  /* ─────────── 5) 레이어 가시성 복원 ─────────── */
  for (var nm in visMap)
    try { doc.layers.getByName(nm).visible = visMap[nm]; } catch(_){}

  // alert("✅ 시안 JPG 저장 완료!");
})();
