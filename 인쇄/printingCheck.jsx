(function () {
  if (app.documents.length === 0) return;

  var doc = app.activeDocument;
  doc.selection = null;

  var count = 0;

  for (var i = 0; i < doc.pageItems.length; i++) {
    var item = doc.pageItems[i];
    if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
      item.selected = true;
      count++;
    }
  }

  if (count > 0) {
    alert("✅ 현재 문서에 이미지가 포함되어 있습니다.");
  }
})();

(function () {
  if (app.documents.length === 0) return;

  var doc = app.activeDocument;
  doc.selection = null;

  var found = false;

  for (var i = 0; i < doc.textFrames.length; i++) {
    var textItem = doc.textFrames[i];
    textItem.selected = true;
    found = true;
  }

  if (found) {
    alert("✅ 현재 문서에 텍스트가 포함되어 있습니다.");
  }
})();

(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }
  var doc = app.activeDocument;

  // ── 1. 파일명 입력 및 사이즈 파싱 ──
  var fileName = prompt("기준 파일명을 입력하세요:\n(예: 엣지 명찰_70x20_실버_자석3구_서울근본치과_4_20250704-0000621)", "");
  if (!fileName) return;

  var parts = fileName.split("_");
  if (parts.length < 2 || parts[1].indexOf("x") === -1) {
    alert("❌ 파일명에 사이즈(예: 70x20) 정보가 없습니다.");
    return;
  }

  var sizeParts = parts[1].split("x");
  var targetW = parseFloat(sizeParts[0]);
  var targetH = parseFloat(sizeParts[1]);

  if (isNaN(targetW) || isNaN(targetH)) {
    alert("❌ 사이즈가 숫자로 인식되지 않습니다.");
    return;
  }

  // mm → pt 변환 (1mm = 2.834645 pt)
  var mmToPt = 2.834645;
  var targetWpt = targetW * mmToPt;
  var targetHpt = targetH * mmToPt;
  // var tolerance = 2 * mmToPt; // 2mm 허용 오차
  var tolerance = (fileName.indexOf("사원증") !== -1 ? 5 : 2) * mmToPt;

  // ── 2. 보이는 레이어의 첫 번째 아트보드 크기 확인 ──
  var firstAB = doc.artboards[0].artboardRect;
  var abW = firstAB[2] - firstAB[0];
  var abH = firstAB[1] - firstAB[3];

  var diffW = Math.abs(abW - targetWpt);
  var diffH = Math.abs(abH - targetHpt);

  if (diffW <= tolerance && diffH <= tolerance) {
    // OK
  } else {
    alert("❌ 디자인 크기 불일치!\n" +
      "파일명 사이즈: " + targetW + "x" + targetH + " mm\n" +
      "현재 아트보드 크기: " + (abW / mmToPt).toFixed(1) + "x" + (abH / mmToPt).toFixed(1) + " mm\n" +
      "(허용 오차 ±2mm)");
  }


  var inputName=fileName;

  // 🔸 파일명에서 수량 추출
  var parts = inputName.split("_");
  if (parts.length < 2) {
    alert("❌ 파일명에 '_'가 부족하여 수량을 추출할 수 없습니다.");
    return;
  }

  var qtyStr = parts[parts.length - 2];
  var qty = parseInt(qtyStr, 10);

  if (isNaN(qty)) {
    alert("❌ 수량을 숫자로 인식할 수 없습니다: " + qtyStr);
    return;
  }

  // 🔸 전체 대지 수
  var abCount = doc.artboards.length;

  // 🔹 ① 새 코드 추가 ――――――――――――――――――――――
  var isIDCard   = inputName.indexOf("사원증") !== -1;   // 파일명에 “사원증”?
  var abForCheck = isIDCard ? abCount / 2 : abCount;    // 비교용 대지 개수
  // ―――――――――――――――――――――――――――――――――――――


  // 🔸 데이터셋 개수 확인
  var dsCount = doc.dataSets.length;

  // 🔸 비교 및 경고
  var errorMsg = "";

  if (qty !== abForCheck) {
    errorMsg += "📌 파일명 수량 (" + qty + ") ≠ "
              + (isIDCard ? "대지*2 개수 (" : "대지 개수 (")
              + abForCheck + ")\n";
  }
  if (dsCount > 0 && qty !== dsCount) {
    errorMsg += "📌 파일명 수량 (" + qty + ") ≠ 데이터셋 개수 (" + dsCount + ")\n";
  }

  if (errorMsg !== "") {
    alert("❌ 수량 불일치!\n\n" + errorMsg);
  }

})();
