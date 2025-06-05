(function () {
  var doc = app.activeDocument;
  if (!doc) {
    alert("문서가 없습니다.");
    return;
  }

  var dsCount = doc.dataSets.length;
  if (dsCount === 0) {
    alert("데이터셋이 없습니다.");
    return;
  }

  // ── 1. 이름_숫자 와 직책_숫자 쌍 찾기 ─────────────────────
  var variablePairs = []; // { nameVar, titleVar, indexStr, label }

  for (var i = 0; i < doc.variables.length; i++) {
    var varName = doc.variables[i].name;

    if (varName.indexOf("이름_") === 0) {
      var indexStr = varName.substring(3); // e.g., 이름_2 → "2"
      var titleName = "직책_" + indexStr;

      // 직책_같은번호가 존재하는지 확인
      for (var j = 0; j < doc.variables.length; j++) {
        if (doc.variables[j].name === titleName) {
          variablePairs.push({
            nameVar: doc.variables[i],
            titleVar: doc.variables[j],
            indexStr: indexStr,
            label: "그룹 " + indexStr
          });
          break;
        }
      }
    }
  }

  // ── 2. 각 데이터셋마다 레이어 선택 정보 출력 ────────────────
  for (var d = 0; d < dsCount; d++) {
    var ds = doc.dataSets[d];
    ds.display();
    $.sleep(100);

    var msg = "📌 데이터셋 " + (d + 1) + "\n----------------------\n";
    var chosenLayer = "[선택된 레이어 없음]";

    for (var g = 0; g < variablePairs.length; g++) {
      var pair = variablePairs[g];
      var nameVal = "[읽기 실패]";
      var titleVal = "[읽기 실패]";

      try {
        nameVal = pair.nameVar.pageItems[0].contents;
        titleVal = pair.titleVar.pageItems[0].contents;
      } catch (e) {}

      msg += pair.label + ": " + nameVal + " / " + titleVal + "\n";

      // 정상 그룹 확인
      if (nameVal !== "Nan" && titleVal !== "Nan") {
        chosenLayer = "Artboard_" + pair.indexStr;
        msg += "✅ 정상 그룹: " + pair.label + "\n";
        msg += "📌 사용할 레이어: " + chosenLayer + "\n";
        break;
      }
    }

    if (chosenLayer === "[선택된 레이어 없음]") {
      msg += "⚠ 정상 그룹 없음 → 레이어 없음\n";
    }

    alert(msg);
  }
})();
