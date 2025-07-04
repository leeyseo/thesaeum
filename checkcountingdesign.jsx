(function () {
  if (app.documents.length === 0) {
    alert("❌ 열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // 🔸 사용자 입력
  var inputName = prompt("파일명을 입력하세요:\n(예: 엣지 명찰_70x20_실버_자석3구_서울근본치과_4_20250704-0000621)", "");
  if (!inputName) return;

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

  // 🔸 데이터셋 개수 확인
  var dsCount = doc.dataSets.length;

  // 🔸 비교 및 경고
  var errorMsg = "";

  if (qty !== abCount) {
    errorMsg += "📌 파일명 수량 (" + qty + ") ≠ 대지 개수 (" + abCount + ")\n";
  }

  if (dsCount > 0 && qty !== dsCount) {
    errorMsg += "📌 파일명 수량 (" + qty + ") ≠ 데이터셋 개수 (" + dsCount + ")\n";
  }

  if (errorMsg !== "") {
    alert("❌ 수량 불일치!\n\n" + errorMsg);
  }
})();
