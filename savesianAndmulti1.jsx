/* ── 현 문서 .ai 백업: C:\work\<번호>\시안기록 ── */
(function () {
  /* 0) 문서 확인 */
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* 1) 사용자 입력 */
  var input = prompt(
    "저장용 전체 이름을 입력하세요:\n" +
    "(예: UV 명찰_70x25_골드_옷핀+집게_재제작_정근진_4_20250626-0000190)",
    ""
  );
  if (!input) return;

  /* 2) 날짜-번호(폴더명) 추출 */
  var m = input.match(/_([0-9]{8}-[0-9]{7})$/);
  if (!m) { alert("❌ '_날짜-번호' 형식을 찾을 수 없습니다."); return; }
  var numFolder = m[1];                        // 예: 20250626-0000190

  /* 3) 저장 폴더 생성: C:\work\<번호>\시안기록 */
  var root      = new Folder("C:/work"); if (!root.exists) root.create();
  var projRoot  = new Folder(root.fsName + "/" + numFolder);
  if (!projRoot.exists) projRoot.create();

  var saveDir   = new Folder(projRoot.fsName + "/시안기록");
  if (!saveDir.exists) saveDir.create();

  /* 4) 파일명 중복 방지 */
  var baseName  = input;           // 입력값 그대로
  var idx       = 0;
  var aiFile    = new File(saveDir.fsName + "/" + baseName + ".ai");
  while (aiFile.exists) {
    idx++;
    aiFile = new File(saveDir.fsName + "/" + baseName + "_" + idx + ".ai");
  }

  /* 5) 저장 옵션 & 저장 */
  var opts = new IllustratorSaveOptions();
  opts.compatibility = Compatibility.ILLUSTRATOR17;       // CC 2013 이상 범용
  opts.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;

  doc.saveAs(aiFile, opts);

  // alert("✅ AI 저장 완료:\n" + aiFile.fsName);
})();


/**
 * ▸ “레이어” 변수 ←→ 더미 텍스트 1개 자동 매핑
 * ▸ 더미 텍스트는 **단 하나의** 레이어 “레이어변수” 안에 생성
 * ▸ 이미 레이어와 매핑이 있으면 새로 만들지 않음
 * ES3 ExtendScript
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }

  /* ── 0. 전역 잠금·숨김 해제 ── */
  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  /* ── 1. ‘레이어’ 변수 확보 ── */
  var layVar = null, i;
  for (i = 0; i < doc.variables.length; i++)
    if (doc.variables[i].name === "레이어") { layVar = doc.variables[i]; break; }

  if (!layVar) {
    layVar = doc.variables.add();
    layVar.name = "레이어";
    layVar.kind = VariableKind.TEXTUAL;
  }

  /* 이미 매핑돼 있으면 아무것도 하지 않음 */
  try { if (layVar.pageItems.length > 0) { alert("이미 매핑돼 있습니다."); return; } }
  catch (_) {}   // 일부 버전 예외 무시

  /* ── 2. 레이어 “레이어변수” 준비 (중복 생성 X) ── */
  var holdLayer;
  try { holdLayer = doc.layers.getByName("레이어변수"); }
  catch (e) { holdLayer = doc.layers.add(); holdLayer.name = "레이어변수"; }

  holdLayer.locked   = false;   // 수정 가능
  holdLayer.template = false;
  holdLayer.visible  = true;    // 생성·확인 시 잠깐 보이도록

  /* ── 3. 더미 텍스트를 아트보드 중앙에 생성 ── */
  var AB = doc.artboards[0].artboardRect;   // [L, T, R, B]
  var cx = (AB[0] + AB[2]) / 2;
  var cy = (AB[1] + AB[3]) / 2;

  doc.activeLayer = holdLayer;
  var tf = holdLayer.textFrames.add();
  tf.contents = "";
  tf.textRange.characterAttributes.size = 1;  // 1 pt
  tf.position = [cx, cy];                     // 중앙

  /* ── 4. 변수와 바인딩 ── */
  try { tf.contentVariable = layVar; }        // CS6+
  catch (e) { tf.variable = layVar; }         // 구버전

  /* ── 5. 레이어 숨김 처리 ── */
  holdLayer.visible = false;

  // alert("✅ 더미 텍스트가 '레이어' 변수에 매핑되었습니다.\n(레이어 '레이어변수'는 숨김 처리됨)");
})();



(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  while (doc.artboards.length > 1) doc.artboards[1].remove();
  var AB0  = doc.artboards[0].artboardRect,
      AB_H = AB0[1] - AB0[3],
      GAP  = 50;

  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;
  try { doc.layers.getByName("출력_디자인").remove(); } catch (_) {}
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


