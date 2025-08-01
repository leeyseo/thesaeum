

(function () {

  /* ───────── 사용자 설정 ───────── */
  var PATH_EDGE   = "C:/work/img/엣지사원증.png";     // 엣지 배경
  var PATH_NORMAL = "C:/work/img/사원증.png";         // 일반 배경
  var PATH_MOCKUP = "C:/work/img/목업.png";           // 목업 배경
  var PATH_DEFAULT = "C:/work/img/default.png"; 

  // var DESIGN_FILL   = 0.975; // 시안전송용 채움(0~1)
  var GAP           = 10;    // 앞·뒤 디자인 간격(pt)

  /* 목업 전용 */
  var MOCK_SCALE    = 0.60;  // 목업 배경 대비 디자인 크기
  var MOCK_OFFSET_Y = -60;   // 목업 ↓ 이동(pt)

  /* 목업 텍스트 */
  var TEXT_FONT   = "GmarketSans"; // 폰트 이름
  var TEXT_SIZE   = 20;            // pt
  var ORDER_OFF   = [  340, -165 ];
  /* ────────────────────────────── */

  /* 0) 문서 검사 */
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument;
  if (doc.artboards.length < 2)   { alert("아트보드가 두 개 이상 필요합니다."); return; }


  try {
    var re = doc.rasterEffectSettings;
    re.resolution = 600;   // 300~600 권장
    doc.rasterEffectSettings = re;
  } catch (e) {}

  var docName = decodeURI(doc.name).replace(/\.ai$/i, "");
  var fullMatch = docName.match(/^(.*?_([0-9]{8}-[0-9]{7}(?:-\d+)?))/);
  if (!fullMatch) {
    alert("❌ 파일명에서 유효한 주문번호를 찾지 못했습니다.");
    return;
  }
  var full = fullMatch[1];  // ← 잘린 형태 예: "UV 사원증_54x86_..._20250623-0810000-07"
  /* 2) 제품코드·주문번호 추출 (예: ..._IMHC_3_20250623-0000362) */
  // var m = full.match(/_([A-Za-z0-9가-힣]+)_[0-9]+_([0-9]{8}-[0-9]{7})$/);
  // 변경 후
  var m = full.match(
    /_(.*?)_[0-9]+_([0-9]{8}-[0-9]{7}(?:-\d+)?)$/
  );
  if (!m){ alert("❌ 파일명에서 제품코드·주문번호를 찾지 못했습니다."); return; }
  // var productCode = m[1];      // IMHC
  var orderNo     = m[2];      // 20250623-0000362

  /* 3) 출력 폴더 & 파일명 */
  var safeName = full.replace(/ /g,"-");
  // var dir = new Folder("C:/work/" + orderNo); if(!dir.exists)dir.create();
  var dir = doc.fullName.parent;
  function uniq(stem){ var f=new File(dir+"/"+stem+".jpg"),i=0;
    while(f.exists){ i++; f=new File(dir+"/"+stem+"_"+i+".jpg"); } return f; }


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


  var dupTag = getDupTag(dir, full);   // ← "(3)" 또는 "_시안"  
  // alert(dupTag);


  var outFix  = uniq(safeName + dupTag + "_확정용");
  // var outSend = uniq(safeName + "_시안전송용");
  var outMock = uniq(safeName + dupTag + "_시안전송목업용");

  /* 4) 배경 이미지 선택 */
  var isEdge = full.indexOf("엣지")!==-1;
  var bgSend = new File(isEdge ? PATH_EDGE : PATH_NORMAL);
  var bgMock = new File(PATH_MOCKUP);

  /* 5) 오른쪽 아트보드 인덱스 */
  var AB0 = doc.artboards[0].artboardRect, R0 = AB0[2], idxR=-1, minL=1e10;
  for (var i=1;i<doc.artboards.length;i++){
    var r=doc.artboards[i].artboardRect;
    if (r[0]>R0 && r[0]<minL){ minL=r[0]; idxR=i; }
  }
  if (idxR===-1) idxR=1;

  /* 6) EXPORT_LAYER에 디자인 복사 */
  try{ doc.layers.getByName("EXPORT_LAYER").remove(); }catch(_){}
  var exp = doc.layers.add(); exp.name="EXPORT_LAYER";
  function copyBoard(bi){
    doc.artboards.setActiveArtboardIndex(bi);
    app.executeMenuCommand("deselectall");
    doc.selectObjectsOnActiveArtboard();
    var g = exp.groupItems.add();
    for (var k=0;k<doc.selection.length;k++)
      doc.selection[k].duplicate(g, ElementPlacement.PLACEATEND);
    return g;
  }
  var g1=copyBoard(0), g2=copyBoard(idxR);

  /* 7) GAP 맞추기 */
  var vb1=g1.visibleBounds, vb2=g2.visibleBounds;
  g2.translate(GAP-(vb2[0]-vb1[2]),0);

  /* 7-b) 확정용용 이름 치환 함수 --------------------------------*/
  var finalName = "홍길동";                 // 필요하면 prompt 로 변경
  function replaceName(item){
    if (item.typename === "TextFrame") {
      if (item.name && item.name.indexOf("이름") !== -1)
        item.contents = finalName;         // 변수명이 ‘이름…’인 것만
    } else if (item.pageItems) {
      for (var i = 0; i < item.pageItems.length; i++)
        replaceName(item.pageItems[i]);    // 재귀
    }
  }
  /*-------------------------------------------------------------*/
  /* ---- 이미지 변수(이미지_1, 이미지_2 …)를 기본 PNG로 교체 ---- */
  var defPic = new File(PATH_DEFAULT);            // 없으면 경고 후 중단
  if (!defPic.exists) {
    alert("❌ 기본 이미지가 없습니다:\n" + defPic.fsName);
    return;
  }
  function replaceAllImages(obj) {
    if (!obj) return;                              // null-check

    if (obj.typename === "PlacedItem") {
      obj.file = defPic;                           // 링크 교체
      // obj.embed();                              // ← 파일을 문서에 임베드하려면 주석 해제
    }

    if (obj.pageItems && obj.pageItems.length) {   // 하위 아이템 재귀
      for (var i = 0; i < obj.pageItems.length; i++)
        replaceAllImages(obj.pageItems[i]);
    }
  }

  /* 8) 바운드 계산 함수 */
  function bounds(lyr){
    var L=1e10,T=-1e10,R=-1e10,B=1e10,ok=false;
    for(var i=0;i<lyr.pageItems.length;i++){
      var it=lyr.pageItems[i]; if(it.hidden)continue;
      var b=it.visibleBounds;
      if(b[0]<L)L=b[0]; if(b[1]>T)T=b[1];
      if(b[2]>R)R=b[2]; if(b[3]<B)B=b[3];
      ok=true;
    }
    return ok?[L,T,R,B]:null;
  }

  /* 9) 레이어 가시성 백업 후 숨김 */
  var vis={}; for(var j=0;j<doc.layers.length;j++){
    var ly=doc.layers[j]; vis[ly.name]=ly.visible; if(ly!==exp)ly.visible=false;
  }

  /* 10) Export 옵션 공통 */
  var opt=new ExportOptionsJPEG();
  opt.qualitySetting=100; opt.resolution=1200;
  opt.horizontalScale=opt.verticalScale=100;
  opt.antiAliasing=true; opt.optimized=true; opt.artBoardClipping=false;
  var SAVE_FIX = false; 
  if (SAVE_FIX) {
        /* 11) 확정용 JPG — '이름' 치환은 여기서만 */
    var fixLayer = doc.layers.add(); fixLayer.name = "EXPORT_FIX";

    /* exp 안의 디자인을 임시 레이어로 복사 */
    for (var i = 0; i < exp.pageItems.length; i++)
      exp.pageItems[i].duplicate(fixLayer, ElementPlacement.PLACEATEND);

    /* 원본 exp는 잠시 숨기고, 복사본만 보이게 */
    exp.visible = false;
    replaceName(fixLayer);    
    replaceAllImages(fixLayer);                   // ← 홍길동 치환
    doc.exportFile(outFix, ExportType.JPEG, opt);

    /* 임시 레이어 제거, exp 다시 표시 */
    fixLayer.remove();
    exp.visible = true;
  }

  // ▼ 최소 픽셀폭 보장 (+ 800% 초과 시 지오메트리 스케일 fallback)
  function ensureMinPixelWidthPlus(layerToExport, exportOpt, minPx) {
    var b = bounds(layerToExport); if (!b) return {usedGeom:false};
    var w_pt = b[2] - b[0];
    var basePx = (w_pt / 72) * exportOpt.resolution * (exportOpt.horizontalScale / 100);
    var needScale = Math.ceil(100 * (minPx / basePx)); // 필요한 export scale(%)

    if (needScale <= 800) {
      if (needScale < 100) needScale = 100;
      exportOpt.horizontalScale = exportOpt.verticalScale = needScale;
      return {usedGeom:false};
    }

    // ── 800% 초과: 임시 레이어에 복제해서 오브젝트 자체를 키운 뒤 800%로 내보내기
    var tmp = doc.layers.add(); tmp.name = "__TMP_EXPORT_BIG__";
    for (var i = 0; i < layerToExport.pageItems.length; i++) {
      layerToExport.pageItems[i].duplicate(tmp, ElementPlacement.PLACEATEND);
    }

    // 기존 레이어는 숨기고, 임시 레이어만 보이게
    var prevVis = layerToExport.visible;
    layerToExport.visible = false;
    tmp.visible = true;

    // 필요한 총 배율 = needScale/100. export는 8배까지만 되니 나머지는 지오메트리로
    var geomScale = Math.ceil((needScale / 800) * 100); // % 단위
    // 임시 레이어의 모든 아이템 확대
    for (var j = 0; j < tmp.pageItems.length; j++) {
      tmp.pageItems[j].resize(geomScale, geomScale, true, true, true, true, true);
    }

    // export 스케일은 800%로 고정
    exportOpt.horizontalScale = exportOpt.verticalScale = 800;

    return {usedGeom:true, tmpLayer: tmp, restore: function() {
      try { tmp.remove(); } catch(e){}
      layerToExport.visible = prevVis;
    }};
  }

  /* 12) 시안전송용 & 목업용 */
  /* 배경 없이 EXPORT_LAYER 그대로 내보내기 */
  var userText = prompt("시안전송 JPG에 넣을 텍스트(없으면 빈칸):", "");
  if (userText === null) userText = "";

  // (선택) 텍스트 오버레이: exp의 합성 바운더리 기준 중앙 하단에 배치
  var txtLayer = null;
  if (userText) {
    var cmb = bounds(exp); // [L,T,R,B]
    txtLayer = doc.layers.add(); txtLayer.name = "TEXT_TMP";
    var tf = txtLayer.textFrames.add();
    tf.contents = userText;
    try { tf.textRange.characterAttributes.textFont = app.textFonts.getByName(TEXT_FONT); } catch(_){}
    tf.textRange.characterAttributes.size = TEXT_SIZE;
    var red = new RGBColor(); red.red=255; red.green=0; red.blue=0;
    tf.textRange.characterAttributes.fillColor = red;
    tf.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;

    // 텍스트 실제 폭(포인트 단위) 측정: 폰트/크기/트래킹 반영
    function measureTextWidthPt(str, fontName, sizePt, tracking) {
      var doc = app.activeDocument;

      // 임시 레이어/포인트 텍스트 생성
      var tmpLayer = doc.layers.add(); tmpLayer.name = "__TMP_MEASURE__";
      var tf = tmpLayer.textFrames.add();
      tf.kind = TextType.POINTTEXT;                  // 반드시 포인트 텍스트
      tf.contents = (str || "").replace(/[\r\n]+/g, " "); // 줄바꿈 제거(단일 줄 측정)

      // 스타일 적용
      var tr = tf.textRange;
      if (fontName) { try { tr.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {} }
      if (sizePt)   { tr.characterAttributes.size = sizePt; }
      if (tracking != null) { tr.characterAttributes.tracking = tracking; } // 천분의 1em 단위

      // 폭 갱신 후 측정
      app.redraw();
      var gb = tf.geometricBounds;                   // [L, T, R, B]
      var widthPt = gb[2] - gb[0];

      // 정리
      try { tmpLayer.remove(); } catch(e) {}
      return widthPt;                                // pt 단위
    }
    

    // 중앙 x, 디자인 하단 B 기준 아래쪽으로 약간 내림(필요시 수치 조정)
    // g1, g2는 앞에서 만든 두 그룹(앞/뒤 디자인)
    var vb1 = g1.visibleBounds; // [L,T,R,B]
    var vb2 = g2.visibleBounds; // [L,T,R,B]

    // 가로: 두 디자인 사이 ‘틈’의 정중앙
    var midBetween = (vb1[2] + vb2[0]) / 2;
    var w = measureTextWidthPt(userText, TEXT_FONT, TEXT_SIZE); 

    // 세로: 두 디자인 중 더 아래쪽(작은 값)의 바닥보다 40pt 아래
    var bottom = Math.min(vb1[3], vb2[3]);

    tf.position = [ midBetween-(w/2), bottom - 40 ];
    txtLayer.zOrder(ZOrderMethod.BRINGTOFRONT);
  }

  // JPEG 옵션은 이미 opt 설정됨(artBoardClipping=false)
  // → 문서의 보이는 객체 경계로 2개 디자인이 한 장에 저장됨
  var ctx = ensureMinPixelWidthPlus(exp, opt, 9000);
  doc.exportFile(outMock, ExportType.JPEG, opt);
  if (ctx.usedGeom) { ctx.restore(); }

  if (txtLayer) txtLayer.remove();

  try { exp.remove(); } catch (_) {}

  /* 13) 레이어 복구 */
  for(var nm in vis){ try{ doc.layers.getByName(nm).visible = vis[nm]; }catch(_){} }

//   alert(
//     "✅ 확정용  : "+outFix.fsName+
//     "\n✅ 전송용  : "+outSend.fsName+
//     "\n✅ 목업용  : "+outMock.fsName+
//     "\n(EXPORT_LAYER 는 문서에 그대로 남아 있습니다)"
//   );

})();