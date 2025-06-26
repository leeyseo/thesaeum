(function () {
  var GAP = 200, PER_COL = 20, SHIFT_X = -1000, SHIFT_Y = 1000;
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument, DS = doc.dataSets;
  if (DS.length === 0) { alert("데이터셋이 없습니다."); return; }

  for (var i = 0; i < doc.layers.length; i++) {
    doc.layers[i].visible = true;
    doc.layers[i].locked = false;
  }

  var imageVars = {}, layVar = null, varPairs = [];
  for (i = 0; i < doc.variables.length; i++) {
    var nm = doc.variables[i].name;
    if (nm === "레이어") layVar = doc.variables[i];
    else if (/^이미지_\d+$/.test(nm)) imageVars[nm] = doc.variables[i];
    else if (nm.indexOf("이름_") === 0) {
      var idx = nm.substring(3), mate = "직책_" + idx;
      for (var j = 0; j < doc.variables.length; j++)
        if (doc.variables[j].name === mate)
          { varPairs.push({idx: idx, nameVar: doc.variables[i], titleVar: doc.variables[j]}); break; }
    }
  }
  if (!layVar) { alert("❌ '레이어' 변수를 찾을 수 없습니다."); return; }

  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");
  while (doc.artboards.length > 1) doc.artboards[1].remove();

  var AB0 = doc.artboards[0].artboardRect,
      AB_W = AB0[2] - AB0[0],
      AB_H = AB0[1] - AB0[3];
  AB0 = [ AB0[0]+SHIFT_X, AB0[1]+SHIFT_Y, AB0[2]+SHIFT_X, AB0[3]+SHIFT_Y ];
  doc.artboards[0].artboardRect = AB0;

  try { doc.layers.getByName("출력_디자인").remove(); } catch(e){}
  var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

  for (var d = 0; d < DS.length; d++) {
    DS[d].display(); $.sleep(30);

    var gIdx = null;
    try {
      var dv = DS[d].getVariableValue ? DS[d].getVariableValue(layVar) : null;
      gIdx = dv ? (dv.textualContents||dv.contents||dv) : null;
    } catch(_){}
    if (!gIdx) try { gIdx = layVar.pageItems[0].contents; } catch(_){}
    if (gIdx) gIdx = gIdx.replace(/\s+/g,"");
    if (!gIdx || gIdx === "Nan") gIdx = null;

    if (!gIdx) {
      for (i=0; i<varPairs.length; i++) {
        try {
          var vN = varPairs[i].nameVar.pageItems[0].contents,
              vT = varPairs[i].titleVar.pageItems[0].contents;
          if (vN !== "Nan" && vT !== "Nan") { gIdx = varPairs[i].idx; break; }
        } catch(_){}
      }
    }

    if (!gIdx) {
      alert("DS" + (d + 1) + " : 사용할 레이어를 판단할 수 없습니다.");
      continue;
    }

    var imageVarName = "이미지_" + gIdx;
    var imageVar = imageVars[imageVarName];
    if (imageVar && imageVar.pageItems.length && imageVar.pageItems[0].typename === "PlacedItem") {
      var item = imageVar.pageItems[0];
      try {
        var absPath = decodeURI(item.file.fullName);
        var newFile = File(absPath);
        if (newFile.exists) {
          item.file = newFile;
          $.writeln("✅ 이미지 재연결 성공: " + absPath);
        } else {
          $.writeln("❌ 이미지 파일 없음: " + absPath);
        }
      } catch(e) {
        $.writeln("❌ 이미지 연결 실패 (DS" + (d+1) + "): " + e);
      }
    }

    var srcLayer;
    try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
    catch(_) { continue; }

    var row = d % PER_COL, col = Math.floor(d / PER_COL);
    var dx = col * (AB_W + GAP), dy = row * (AB_H + GAP);
    var rect = [AB0[0]+dx, AB0[1]-dy, AB0[2]+dx, AB0[3]-dy];
    var abIdx;
    if (d === 0) {
      abIdx = 0;
    } else {
      doc.artboards.add(rect);
      abIdx = doc.artboards.length - 1;
    }

    var grp = outLayer.groupItems.add();
    grp.name = "DS" + (d+1) + "_" + gIdx;
    for (i=0; i<srcLayer.pageItems.length; i++) {
      var it = srcLayer.pageItems[i];
      if (!it.locked && !it.hidden)
        it.duplicate(grp, ElementPlacement.PLACEATEND);
    }

    // ✅ 정확한 위치 보정
    var bounds = grp.visibleBounds;
    var designLeft = bounds[0], designTop = bounds[1];
    var abRect = doc.artboards[abIdx].artboardRect;
    var abLeft = abRect[0], abTop = abRect[1];
    var dx2 = abLeft - designLeft;
    var dy2 = abTop - designTop;
    grp.position = [grp.position[0] + dx2, grp.position[1] + dy2];

    try { grp.artboard = abIdx; } catch(_) {}
  }

  DS[0].display();
  for (var i = 0; i < doc.layers.length; i++) {
    var lay = doc.layers[i];
    lay.visible = (lay.name === "출력_디자인");
  }

  alert("✅ 이미지 자동 연결 + 전체 배치 완료 (출력_디자인만 표시)");
})();
