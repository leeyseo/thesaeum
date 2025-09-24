(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  // 이미 결과 레이어가 있으면 재실행 방지
  try { if (doc.layers.getByName("출력_디자인")) return; } catch (_) {}

  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  // 아트보드 0만 남기기
  while (doc.artboards.length > 1) doc.artboards[1].remove();

  var AB0   = doc.artboards[0].artboardRect,     // [L,T,R,B]
      AB_W  = AB0[2] - AB0[0],
      AB_H  = AB0[1] - AB0[3];

  var GAP_V = 50;     // 행(세로) 간격
  var GAP_H = 50;     // 열(가로) 간격
  var ROWS_PER_COL = 50;  // ★ 50개마다 새 열로

  // 전 레이어 숨기고 출력 레이어 생성
  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;
  var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

  // 변수 수집
  var layVar = null, varPairs = [], j;
  for (i = 0; i < doc.variables.length; i++) {
    var nm = doc.variables[i].name;
    if (nm === "레이어") layVar = doc.variables[i];
    if (nm.indexOf("이름_") === 0) {
      var idx = nm.substring(3), mate = "직책_" + idx;
      for (j = 0; j < doc.variables.length; j++) {
        if (doc.variables[j].name === mate) {
          varPairs.push({ idx: idx, nameVar: doc.variables[i], titleVar: doc.variables[j] });
          break;
        }
      }
    }
  }
  if (!layVar) { alert("변수 '레이어' 가 없습니다."); return; }
  // [추가] 그래픽 변수 수집
  var imgVars = [];
  for (i = 0; i < doc.variables.length; i++) {
    try {
      if (doc.variables[i].kind == VariableKind.GRAPHICS) imgVars.push(doc.variables[i]);
    } catch (e) {}
  }

  // [추가] 헬퍼들 (ES3 호환)
  function _fs(p){ try{ return decodeURI(p.fsName || p.fullName || p.toString()); } catch(e){ return ""+p; } }
  function getFileFromVarValue(val){
    var f = null;
    if (!val) return null;
    if (val instanceof File) return val;
    try { if (val.file) return val.file; } catch(e){}
    try {
      if (val.fsName || val.fullName || val.name) return new File(val.fsName || val.fullName || val.name);
    } catch(e){}
    try { return new File(val.toString()); } catch(e){}
    return null;
  }
  function listMissingGraphics(ds){
    var missing = [];
    for (var k = 0; k < imgVars.length; k++){
      var v = imgVars[k], val = null, f = null;
      try { val = ds.getVariableValue(v); } catch(e){}
      f = getFileFromVarValue(val);
      if (!f) { missing.push(v.name + " → (값 없음)"); continue; }
      if (!f.exists) missing.push(v.name + " → " + _fs(f));
    }
    return missing;
  }


  // 데이터셋 반복
  for (var d = 0; d < doc.dataSets.length; d++) {
    var ds = doc.dataSets[d];

    // 이미지 누락 선검사
    var missing = listMissingGraphics(ds);
    if (missing.length > 0) {
      alert("⚠️ 데이터셋 #" + (d+1) + " 이미지 파일을 찾을 수 없습니다.\n - " + missing.join("\n - "));
      continue; // 이 DS는 건너뜀 (원하면 주석 처리)
    }

    // 안전 표시
    try {
      ds.display(); $.sleep(60);
    } catch (e) {
      alert("⚠️ 데이터셋 #" + (d+1) + " 표시 오류: " + e);
      continue;
    }


    // 사용할 레이어 인덱스 판단
    var gIdx = null, lyrVal = null;
    try {
      if (typeof ds.getVariableValue === "function") {
        var dv = ds.getVariableValue(layVar);
        lyrVal = dv.textualContents || dv.contents || dv;
      }
    } catch (_) {}
    if (lyrVal == null) { try { lyrVal = layVar.pageItems[0].contents; } catch (_) {} }
    if (lyrVal && lyrVal !== "Nan") gIdx = lyrVal;
    if (!gIdx) {
      for (i = 0; i < varPairs.length; i++) {
        try {
          var vN = varPairs[i].nameVar.pageItems[0].contents,
              vT = varPairs[i].titleVar.pageItems[0].contents;
          if (vN !== "Nan" && vT !== "Nan") { gIdx = varPairs[i].idx; break; }
        } catch (_) {}
      }
    }
    if (!gIdx) { alert("DS" + (d+1) + ": 사용할 레이어를 판단할 수 없습니다."); continue; }

    var srcLayer;
    try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
    catch (_) { alert("Artboard_" + gIdx + " 레이어가 없습니다."); continue; }

    // ★ 격자 배치: 50개마다 새 열
    var row = d % ROWS_PER_COL;                       // 0..49
    var col = Math.floor(d / ROWS_PER_COL);           // 0,1,2,...

    var shiftX = col * (AB_W + GAP_H);
    var shiftY = -row * (AB_H + GAP_V);

    var rect   = [AB0[0] + shiftX, AB0[1] + shiftY, AB0[2] + shiftX, AB0[3] + shiftY];
    var abIdx;

    if (d === 0) {
      // 첫 번째는 기존 아트보드 사용 (row=0,col=0이므로 이동 없음)
      abIdx = 0;
    } else {
      try {
        doc.artboards.add(rect);
      } catch (e) {
        // 혹시라도 AOoC가 나면 강제로 다음 열부터 시작
        col += 1;
        shiftX = col * (AB_W + GAP_H);
        shiftY = 0;
        rect   = [AB0[0] + shiftX, AB0[1], AB0[2] + shiftX, AB0[3]];
        doc.artboards.add(rect);
      }
      abIdx = doc.artboards.length - 1;
    }

    // 디자인 복제 → 그룹
    var grp = outLayer.groupItems.add();
    grp.name = "DS" + (d+1) + "_" + gIdx;

    for (i = 0; i < srcLayer.pageItems.length; i++) {
      var it = srcLayer.pageItems[i];
      if (!it.locked && !it.hidden) it.duplicate(grp, ElementPlacement.PLACEATEND);
    }

    // 새 아트보드 좌상단에 정렬
    var b     = grp.visibleBounds,         // [L,T,R,B]
        gLeft = b[0], gTop = b[1];
    var abR   = doc.artboards[abIdx].artboardRect,
        aLeft = abR[0], aTop = abR[1];

    var dx = aLeft - gLeft, dy = aTop - gTop;
    grp.position = [grp.position[0] + dx, grp.position[1] + dy];
    try { grp.artboard = abIdx; } catch (_) {}
  }

  // 보기 복구
  doc.dataSets[0].display();
})();
