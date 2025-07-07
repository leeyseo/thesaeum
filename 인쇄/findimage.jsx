// (function () {
//   if (app.documents.length === 0) {
//     alert("열린 문서가 없습니다.");
//     return;
//   }

//   var doc = app.activeDocument;
//   var hasImage = false;

//   // 모든 페이지 아이템 순회
//   for (var i = 0; i < doc.pageItems.length; i++) {
//     var item = doc.pageItems[i];

//     // 이미지 여부 확인 (PlacedItem 또는 RasterItem)
//     if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
//       hasImage = true;
//       break;
//     }
//   }

//   if (hasImage) {
//     alert("✅ 현재 문서에 이미지가 포함되어 있습니다.");
//   } else {
//     alert("❌ 현재 문서에는 이미지가 없습니다.");
//   }
// })();
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
