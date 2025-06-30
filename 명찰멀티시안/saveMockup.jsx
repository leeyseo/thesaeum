/* ─── JPG 3종 + 주문번호·고객명 텍스트 (좌표 지정) ─────────────────────────────── */
(function () {

  /* 0) 문서 검사 */
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* 1) 입력 */
  var input = prompt(
    "저장용 전체 이름 입력:\n(예: 엣지 명찰_70x20_골드_옷핀+집게_CW 청원케딜락_1_20250623-0001503)",
    ""
  );
  if (!input) return;

  var baseOrig = input;                    // 표시용(공백 포함)
  var basePath = input.replace(/ /g, "-"); // 경로·파일명용

  var parts = baseOrig.split("_");
  if (parts.length < 7) { alert("❌ 입력 형식 오류"); return; }

  var orderNo  = parts[6];                        // 20250623-0001503
  var customer = parts[4];                        // CW 청원케딜락
  var imgKey   = (parts[0].indexOf("엣지") !== -1 ? "엣지_" : "") +
                 parts[1] + "_" + parts[2];       // 배경키

  /* 배경 이미지 & 목업 */
  var bgImg  = new File("C:/work/img/" + imgKey + ".png");
  if (!bgImg.exists) { alert("❌ 배경 이미지 없음:\n" + bgImg.fsName); return; }
  var mockBg = new File("C:/work/img/목업.png");
  if (!mockBg.exists) { alert("❌ 목업 이미지 없음:\n" + mockBg.fsName); return; }

  /* 출력 폴더 */
  var jpgDir = new Folder("C:/work/" + orderNo + "/jpg"); if (!jpgDir.exists) jpgDir.create();
  function uniq(name){var f=new File(jpgDir+"/"+name+".jpg"),n=0;
    while(f.exists){n++;f=new File(jpgDir+"/"+name+"_"+n+".jpg");}return f;}

  var siAnFile = uniq(basePath + "_시안전송용");
  var hwakFile = uniq(basePath + "_확정형");
  var mockFile = uniq(basePath + "_시안전송목업용");

  /* 2) 전경 PNG (배경 투명) */
  doc.artboards.setActiveArtboardIndex(0);
  app.executeMenuCommand("deselectall"); doc.selectObjectsOnActiveArtboard();

  var ab=doc.artboards[0].artboardRect, AW=ab[2]-ab[0], AH=ab[1]-ab[3],
      tol=Math.max(10,AW*0.02), sel=doc.selection;
  for(var i=0;i<sel.length;i++){
    var it=sel[i];
    if(it.typename==="PathItem"&&it.filled){
      var b=it.geometricBounds,w=b[2]-b[0],h=b[1]-b[3];
      if(Math.abs(w-AW)<=tol&&Math.abs(h-AH)<=tol) it.fillColor=new NoColor();
    }
  }
  var tmpPng=new File(Folder.temp+"/__tmp_fg__.png");
  var pOpt=new ExportOptionsPNG24();
  pOpt.transparency=true;pOpt.antiAliasing=true;pOpt.artBoardClipping=true;
  pOpt.horizontalScale=pOpt.verticalScale=300;
  doc.exportFile(tmpPng,ExportType.PNG24,pOpt);

  /* 공통 JPG 옵션 */
  var jOpt=new ExportOptionsJPEG();
  jOpt.qualitySetting=100;jOpt.resolution=600;
  jOpt.horizontalScale=jOpt.verticalScale=100;
  jOpt.antiAliasing=true;jOpt.optimized=true;jOpt.artBoardClipping=true;

  /* 3) 합성 함수 */
  function composite(bg, fg, out, ratio, yShift,
                     txt1, off1, txt2, off2, font){
    if(ratio==null)ratio=1;if(yShift==null)yShift=0;
    var nd=app.documents.add(DocumentColorSpace.RGB,2000,1000),
        b=nd.placedItems.add(), f=nd.placedItems.add();
    b.file=bg; f.file=fg; app.redraw();

    b.position=[0,b.height]; var W=b.width,H=b.height;
    nd.artboards[0].artboardRect=[0,H,W,0];

    var sPct=(W*ratio/f.width)*100;
    f.resize(sPct,sPct);
    var spare=H-f.height;
    f.position=[(W-f.width)/2, H-(spare/2)-(spare*yShift)];

    var black=new RGBColor(); black.red=black.green=black.blue=0;
    function putText(txt,off,sz){
      if(!txt||!off) return;
      var t=nd.textFrames.add(); t.contents=txt;
      var ft=null;
      if(font) try{ft=app.textFonts.getByName(font);}catch(e){}
      if(!ft) ft=app.textFonts[0];
      t.textRange.characterAttributes.textFont=ft;
      t.textRange.characterAttributes.size=sz||40;
      t.textRange.characterAttributes.fillColor=black;
      t.position=[off[0], H-off[1]];        // 좌상단 기준
    }
    putText(txt1,off1,40);
    putText(txt2,off2,40);

    nd.exportFile(out,ExportType.JPEG,jOpt);
    nd.close(SaveOptions.DONOTSAVECHANGES);
  }

  /* 4) 시안전송용 */
  composite(bgImg,tmpPng,siAnFile,1,0.1,null,null,null,null,"GmarketSans");

  /* 5) 확정형 */
  doc.exportFile(hwakFile,ExportType.JPEG,jOpt);

  /* 6) 시안전송목업용 (주문번호 & 고객명) */
  composite(mockBg,siAnFile,mockFile,
            0.6,0.1,
            orderNo,[340,165],
            customer,[340,80],
            "GmarketSans");

  tmpPng.remove();
  alert("✅ JPG 3종 저장 완료:\n• "+siAnFile.name+"\n• "+hwakFile.name+"\n• "+mockFile.name);

})();
