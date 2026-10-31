// Firebase の設定（SETUP-ADMIN.md の手順で作った値に書きかえる）。
// null のままなら、履歴の記録・警告・出禁はすべて無効（サイトは今まで通り動く）。
window.SGL_FIREBASE = null;
/* 設定例:
window.SGL_FIREBASE = {
  apiKey: "...", authDomain: "xxxx.firebaseapp.com", projectId: "xxxx",
  appId: "...",
  adminUid: "管理者のUID（Authenticationで作った自分のUID）"
};
*/
