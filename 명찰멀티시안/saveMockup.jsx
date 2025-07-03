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
  var outDir = new Folder("C:/work/" + orderNo);
  if (!outDir.exists) outDir.create();
  function uniq(name){var f=new File(outDir+"/"+name+".jpg"),n=0;
    while(f.exists){n++;f=new File(outDir+"/"+name+"_"+n+".jpg");}return f;}

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


  var finalName = "홍길동";
  var found = false;
  var oldContent = "";

  // 새 문서 만들기 (원본 아트보드와 같은 크기)
  var ab = doc.artboards[0].artboardRect;
  var AW = ab[2] - ab[0], AH = ab[1] - ab[3];
  var tempDoc = app.documents.add(DocumentColorSpace.RGB, AW, AH);
  tempDoc.artboards[0].artboardRect = [0, AH, AW, 0];

  // ✅ 복사 전 활성화
  doc.activate();
  doc.artboards.setActiveArtboardIndex(0);
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard();
  app.copy();

  // ✅ 붙여넣기 전 활성화
  tempDoc.activate();
  app.paste();

  // 🔄 '이름' 포함된 변수만 치환
  function replaceNameIn(container) {
    for (var i = 0; i < container.pageItems.length; i++) {
      var item = container.pageItems[i];
      if (item.typename === "GroupItem") {
        replaceNameIn(item);
      } else if (item.typename === "TextFrame") {
        if (item.name && item.name.indexOf("이름") !== -1) {
          found = true;
          oldContent = item.contents;
          item.contents = finalName;
        }
      }
    }
  }
  replaceNameIn(tempDoc);

  // JPG 저장
  tempDoc.exportFile(hwakFile, ExportType.JPEG, jOpt);
  tempDoc.close(SaveOptions.DONOTSAVECHANGES);
  // // 결과 처리
  // if (!found) {
  //   alert("❌ '이름'이라는 변수명을 가진 텍스트 요소를 찾을 수 없습니다.");
  // } else {
  //   alert("✅ 기존 이름 텍스트: " + oldContent + "\n→ 변경됨: " + finalName);
  //   doc.exportFile(hwakFile, ExportType.JPEG, jOpt);
  // }

  /* 6) 시안전송목업용 (주문번호 & 고객명) */

  // 🧾 사용자 입력 받기
  var userText = prompt("시안전송 목업 JPG에 넣을 텍스트를 입력하세요:", "");
  if (userText === null) userText = ""; // 취소해도 계속 진행

  // 📄 새 문서에 배경 + 전경 디자인 불러오기
  var nd = app.documents.add(DocumentColorSpace.RGB, 2000, 1000);
  var b = nd.placedItems.add();
  var f = nd.placedItems.add();
  b.file = mockBg;
  f.file = siAnFile;
  app.redraw();

  b.position = [0, b.height];
  var W = b.width, H = b.height;
  nd.artboards[0].artboardRect = [0, H, W, 0];

  var sPct = (W * 0.6 / f.width) * 100;
  f.resize(sPct, sPct);
  var spare = H - f.height;
  f.position = [(W - f.width)/2, H - (spare/2) - (spare * 0.1)];

  // 🔴 텍스트 영역 추가 (줄바꿈 지원)
  if (userText !== "") {
    var tf = nd.textFrames.areaText(nd.pathItems.rectangle(H - 900, 260, 1000, 120)); // (top, left, width, height)
    tf.contents = userText;

    var red = new RGBColor();
    red.red = 255; red.green = 0; red.blue = 0;

    tf.textRange.characterAttributes.fillColor = red;
    tf.textRange.characterAttributes.size = 36;

    try {
      tf.textRange.characterAttributes.textFont = app.textFonts.getByName("GmarketSans");
    } catch (e) {
      tf.textRange.characterAttributes.textFont = app.textFonts[0];
    }

    tf.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;
  }

  // 저장
  nd.exportFile(mockFile, ExportType.JPEG, jOpt);
  nd.close(SaveOptions.DONOTSAVECHANGES);

  tmpPng.remove();
  alert("✅ JPG 3종 저장 완료:\n• "+siAnFile.name+"\n• "+hwakFile.name+"\n• "+mockFile.name);

})();
