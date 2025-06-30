

(function () {

  /* ───────── 사용자 설정 ───────── */
  var PATH_EDGE   = "C:/work/img/엣지사원증.png";     // 엣지 배경
  var PATH_NORMAL = "C:/work/img/사원증.png";         // 일반 배경
  var PATH_MOCKUP = "C:/work/img/목업.png";           // 목업 배경

  var DESIGN_FILL   = 0.975; // 시안전송용 채움(0~1)
  var GAP           = 65;    // 앞·뒤 디자인 간격(pt)

  /* 목업 전용 */
  var MOCK_SCALE    = 0.60;  // 목업 배경 대비 디자인 크기
  var MOCK_OFFSET_Y = -60;   // 목업 ↓ 이동(pt)

  /* 목업 텍스트 */
  var TEXT_FONT   = "GmarketSans"; // 폰트 이름
  var TEXT_SIZE   = 50;            // pt
  var CODE_OFF    = [  340, -80 ]; // BG 좌상단 기준 (dx, dy)
  var ORDER_OFF   = [  340, -165 ];
  /* ────────────────────────────── */

  /* 0) 문서 검사 */
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument;
  if (doc.artboards.length < 2)   { alert("아트보드가 두 개 이상 필요합니다."); return; }

  /* 1) 파일명 입력 */
  var full = prompt(
    "저장용 전체 이름 입력:\n(예: 엣지 사원증_54x86_세로타공_IMHC_3_20250623-0000362)",
    ""
  );
  if (!full) return;

  /* 2) 제품코드·주문번호 추출 (예: ..._IMHC_3_20250623-0000362) */
  var m = full.match(/_([A-Za-z0-9]+)_[0-9]+_([0-9]{8}-[0-9]{7})$/);
  if (!m){ alert("❌ 파일명에서 제품코드·주문번호를 찾지 못했습니다."); return; }
  var productCode = m[1];      // IMHC
  var orderNo     = m[2];      // 20250623-0000362

  /* 3) 출력 폴더 & 파일명 */
  var safeName = full.replace(/ /g,"-");
  var dir = new Folder("C:/work/" + orderNo + "/jpg"); if(!dir.exists)dir.create();
  function uniq(stem){ var f=new File(dir+"/"+stem+".jpg"),i=0;
    while(f.exists){ i++; f=new File(dir+"/"+stem+"_"+i+".jpg"); } return f; }
  var outFix  = uniq(safeName + "_확정용");
  var outSend = uniq(safeName + "_시안전송용");
  var outMock = uniq(safeName + "_시안전송목업용");

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
  opt.qualitySetting=100; opt.resolution=600;
  opt.horizontalScale=opt.verticalScale=100;
  opt.antiAliasing=true; opt.optimized=true; opt.artBoardClipping=false;

  /* 11) 확정용 JPG */
  doc.exportFile(outFix, ExportType.JPEG, opt);

  /* ───────── 공통 합성 함수 ───────── */
  function composite(bgFile, ratio, offY, outFile, addText){
    if(!bgFile.exists){ alert("⚠ 배경 없음:\n"+bgFile.fsName); return; }

    /* A) 배경 */
    var bgL = doc.layers.add(); bgL.name="BG_TEMP";
    var bg  = bgL.placedItems.add(); bg.file=bgFile;
    var bgVB = bg.visibleBounds;          // [L,T,R,B]
    var bgW  = bgVB[2]-bgVB[0], bgH=bgVB[1]-bgVB[3];

    /* B) 디자인 복사본 */
    var tmp = doc.layers.add(); tmp.name="EXP_TMP";
    var t1=g1.duplicate(tmp,ElementPlacement.PLACEATEND);
    var t2=g2.duplicate(tmp,ElementPlacement.PLACEATEND);
    exp.visible=false;

    /* C) 스케일 */
    var dVB=bounds(tmp), dW=dVB[2]-dVB[0], dH=dVB[1]-dVB[3];
    var pct = ratio * Math.min(bgW/dW, bgH/dH) * 100;
    t1.resize(pct,pct,true,true,true,true,true);
    t2.resize(pct,pct,true,true,true,true,true);

    /* D) GAP 재조정 */
    var nt1=t1.visibleBounds, nt2=t2.visibleBounds;
    t2.translate(GAP-(nt2[0]-nt1[2]),0);

    /* E) 중앙 정렬 + offY */
    var cmb=bounds(tmp);
    var dx=(bgVB[0]+bgVB[2])/2 - (cmb[0]+cmb[2])/2;
    var dy=(bgVB[1]+bgVB[3])/2 - (cmb[1]+cmb[3])/2 + offY;
    t1.translate(dx,dy); t2.translate(dx,dy);

    /* F) 텍스트 추가(목업) */
    if(addText){
      var txtL = doc.layers.add(); txtL.name="TEXT_TMP";
      function addTxt(txt, off){
        var tf=txtL.textFrames.add();
        tf.contents=txt;
        tf.textRange.size=TEXT_SIZE;
        /* 지마켓산스 없으면 기본 글꼴 */
        try {
          tf.textRange.characterAttributes.textFont =
              app.textFonts.getByName(TEXT_FONT);
        } catch (_) {}
        /* BG 좌상단 + 오프셋 */
        tf.position=[ bgVB[0] + off[0], bgVB[1] + off[1] ];
      }
      addTxt(productCode, CODE_OFF);
      addTxt(orderNo,    ORDER_OFF);
      txtL.zOrder(ZOrderMethod.BRINGTOFRONT);
    }

    /* G) 내보내기 */
    bgL.zOrder(ZOrderMethod.SENDTOBACK);
    doc.exportFile(outFile,ExportType.JPEG,opt);

    /* H) 정리 */
    if(addText) txtL.remove();
    tmp.remove(); bgL.remove(); exp.visible=true;
  }

  /* 12) 시안전송용 & 목업용 */
  composite(bgSend, DESIGN_FILL, 0,              outSend, false);
  composite(bgMock, MOCK_SCALE,  MOCK_OFFSET_Y,  outMock, true);

  /* 13) 레이어 복구 */
  for(var nm in vis){ try{ doc.layers.getByName(nm).visible = vis[nm]; }catch(_){} }

//   alert(
//     "✅ 확정용  : "+outFix.fsName+
//     "\n✅ 전송용  : "+outSend.fsName+
//     "\n✅ 목업용  : "+outMock.fsName+
//     "\n(EXPORT_LAYER 는 문서에 그대로 남아 있습니다)"
//   );

})();
