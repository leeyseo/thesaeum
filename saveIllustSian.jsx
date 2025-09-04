(function () {
  /* 0) 문서 확인 */
  if (app.documents.length === 0) {
    alert("문서가 없습니다.");
    return;
  }
  var doc = app.activeDocument;

  /* 1) 사용자 입력 */
  var input = prompt(
    "저장용 전체 이름을 입력하세요:\n" +
    "(예: UV 명찰_70x25_골드_옷핀+집게_재제작_정근진_4_20250626-0000190)",
    ""
  );
  if (!input) return;
  input = input.replace(/[\/\\:\*\?"<>\|]/g, "-");
  /* 2) 날짜-번호(폴더명) 추출 */
  var m = input.match(/_([0-9]{8}-[0-9]{7}(?:-\d+)?)/);
  if (!m) {
    alert("❌ '_날짜-번호' 형식을 찾을 수 없습니다.");
    return;
  }
  var numFolder = m[1].split("+")[0];  // 예: 20250626-0000190

  /* 3) 저장 폴더 생성 */
  var root = new Folder("C:/work");
  if (!root.exists) root.create();

  var projRoot = new Folder(root.fsName + "/" + numFolder);
  if (!projRoot.exists) projRoot.create();

  // 📁 Sian 폴더 자동 생성: Sian1, Sian2, ...
  var saveDir = null;
  var sianIdx = 0;
  for (var i = 1; i <= 99; i++) {
    var tryDir = new Folder(projRoot.fsName + "/Sian" + i);
    if (!tryDir.exists) {
      tryDir.create();
      saveDir = tryDir;
      sianIdx = i;
      break;
    }
  }
  if (saveDir == null) {
    alert("❌ Sian1~Sian99까지 폴더가 모두 존재합니다.");
    return;
  }

  /* 4) 파일명 구성: 폴더 이름에 따라 _번호 붙이기 */
  var baseName = input + "_" + sianIdx;
  var idx = 0;
  var aiFile = new File(saveDir.fsName + "/" + baseName + ".ai");
  while (aiFile.exists) {
    idx++;
    aiFile = new File(saveDir.fsName + "/" + baseName + "_" + idx + ".ai");
  }

  /* 5) 저장 옵션 & 저장 */
  var opts = new IllustratorSaveOptions();
  opts.compatibility = Compatibility.ILLUSTRATOR17;
  opts.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;

  doc.saveAs(aiFile, opts);
})();
