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

  var saveDir   = new Folder(projRoot.fsName);
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
