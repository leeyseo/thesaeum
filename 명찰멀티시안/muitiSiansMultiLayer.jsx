(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }
    // ✅ 이미 있으면 경고 후 종료
  try {
    if (doc.layers.getByName("출력_디자인")) {
      // alert("❌ 이미 '출력_디자인' 레이어가 존재합니다.\n작업을 취소합니다.");
      return;
    }
  } catch (_) {}

  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  while (doc.artboards.length > 1) doc.artboards[1].remove();
  var AB0  = doc.artboards[0].artboardRect,
      AB_H = AB0[1] - AB0[3],
      GAP  = 50;

  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;

  var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

  var layVar = null, varPairs = [];
  for (i = 0; i < doc.variables.length; i++) {
    var nm = doc.variables[i].name;
    if (nm === "레이어") layVar = doc.variables[i];
    if (nm.indexOf("이름_") === 0) {
      var idx = nm.substring(3), mate = "직책_" + idx;
      for (var j = 0; j < doc.variables.length; j++) {
        if (doc.variables[j].name === mate) {
          varPairs.push({ idx: idx, nameVar: doc.variables[i], titleVar: doc.variables[j] });
          break;
        }
      }
    }
  }
  if (!layVar) { alert("변수 '레이어' 가 없습니다."); return; }

  for (var d = 0; d < doc.dataSets.length; d++) {
    var ds = doc.dataSets[d];
    ds.display(); $.sleep(60);

    var gIdx = null, lyrVal = null;
    try {
      if (typeof ds.getVariableValue === "function") {
        var dv = ds.getVariableValue(layVar);
        lyrVal = dv.textualContents || dv.contents || dv;
      }
    } catch (_) {}

    if (lyrVal == null) {
      try { lyrVal = layVar.pageItems[0].contents; } catch (_) {}
    }
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
    if (!gIdx) {
      alert("DS" + (d+1) + ": 사용할 레이어를 판단할 수 없습니다.");
      continue;
    }

    var srcLayer;
    try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
    catch (_) {
      alert("Artboard_" + gIdx + " 레이어가 없습니다.");
      continue;
    }

    var dy = -d * (AB_H + GAP),
        rect = [AB0[0], AB0[1] + dy, AB0[2], AB0[3] + dy],
        abIdx;

    if (d === 0) {
      abIdx = 0;
    } else {
      doc.artboards.add(rect);
      abIdx = doc.artboards.length - 1;
    }

    var grp = outLayer.groupItems.add();
    grp.name = "DS" + (d+1) + "_" + gIdx;

    for (i = 0; i < srcLayer.pageItems.length; i++) {
      var it = srcLayer.pageItems[i];
      if (!it.locked && !it.hidden) {
        it.duplicate(grp, ElementPlacement.PLACEATEND);
      }
    }

    // 정확한 위치 맞춤 (디자인 ↔ 새 아트보드)
    var bounds = grp.visibleBounds; // [L, T, R, B]
    var designLeft = bounds[0], designTop = bounds[1];

    var abRect = doc.artboards[abIdx].artboardRect;
    var abLeft = abRect[0], abTop = abRect[1];

    var dx = abLeft - designLeft;
    var dy2 = abTop - designTop;

    grp.position = [grp.position[0] + dx, grp.position[1] + dy2];
    try { grp.artboard = abIdx; } catch (_) {}
  }

  doc.dataSets[0].display();
})();
