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
  var tolerance = 2 * mmToPt; // 2mm 허용 오차

  // ── 2. 보이는 레이어의 첫 번째 아트보드 크기 확인 ──
  var firstAB = doc.artboards[0].artboardRect;
  var abW = firstAB[2] - firstAB[0];
  var abH = firstAB[1] - firstAB[3];

  var diffW = Math.abs(abW - targetWpt);
  var diffH = Math.abs(abH - targetHpt);

  if (diffW <= tolerance && diffH <= tolerance) {
    // OK
    return;
  } else {
    alert("❌ 디자인 크기 불일치!\n" +
      "파일명 사이즈: " + targetW + "x" + targetH + " mm\n" +
      "현재 아트보드 크기: " + (abW / mmToPt).toFixed(1) + "x" + (abH / mmToPt).toFixed(1) + " mm\n" +
      "(허용 오차 ±2mm)");
  }
})();
