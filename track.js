// ランダムIDでプレイ履歴を記録し、管理者からの警告・出禁を表示する（Firebase / Firestore を使用）
(function () {
  var cfg = window.SGL_FIREBASE; if (!cfg) return;
  var V = '10.12.2', B = 'https://www.gstatic.com/firebasejs/' + V + '/';
  function getId() {
    try {
      var id = localStorage.getItem('sgl-id');
      if (!id) {
        var a = new Uint8Array(9); crypto.getRandomValues(a);
        id = Array.prototype.map.call(a, function (x) { return 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]; }).join('') + Date.now().toString(36).slice(-3);
        localStorage.setItem('sgl-id', id);
      }
      return id;
    } catch (e) { return null; }
  }
  function shown() { try { return !!sessionStorage.getItem('sgl-notice-shown'); } catch (e) { return false; } }
  function page() { var m = location.pathname.match(/\/games\/([^\/]+)/); return m ? m[1] : 'top'; }

  function overlay(html, dismiss) {
    var o = document.createElement('div');
    o.setAttribute('role', 'alertdialog'); o.setAttribute('aria-modal', 'true');
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0b1020;display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Hiragino Kaku Gothic ProN","Yu Gothic UI","Meiryo",sans-serif';
    o.innerHTML = html; document.body.appendChild(o);
    if (dismiss) { var b = o.querySelector('button'); b.focus(); b.addEventListener('click', function () { o.remove(); dismiss(); }); }
    return o;
  }
  var box = function (col, inner) { return '<div style="max-width:30em;width:100%;background:#151d3a;color:#e8ecff;border:3px solid ' + col + ';box-shadow:6px 6px 0 #000;padding:24px 22px;line-height:1.8;text-align:center">' + inner + '</div>'; };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function adminLink() {
    if (page() !== 'top') return;
    var a = document.createElement('a'); a.href = 'admin.html'; a.textContent = '管理者ページ';
    a.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:20;font:bold 13px sans-serif;color:#0b1020;background:#ffd34d;padding:6px 12px;text-decoration:none;box-shadow:3px 3px 0 #000';
    document.body.appendChild(a);
  }
  function run() {
    var id = getId(); if (!id) return;
    Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-firestore.js'), import(B + 'firebase-auth.js')]).then(function (m) {
      var app = m[0].initializeApp(cfg), f = m[1], db = f.getFirestore(app), ref = f.doc(db, 'clients', id), auth = m[2].getAuth(app);
      // 管理者ページにログインしているブラウザ（管理者のUID）は、記録・警告・出禁の対象にしない
      return auth.authStateReady().then(function () {
        if (cfg.adminUid && auth.currentUser && auth.currentUser.uid === cfg.adminUid) { adminLink(); return 'admin'; }
      }).then(function (isAdmin) {
      if (isAdmin) return;
      return f.getDoc(ref).then(function (snap) {
        var now = f.serverTimestamp();
        if (!snap.exists()) {
          return f.setDoc(ref, { createdAt: now, lastSeen: now, warnings: 0, banned: false, ackWarnings: 0 }).then(function () { return null; });
        }
        return snap.data();
      }).then(function (d) {
        f.addDoc(f.collection(ref, 'plays'), { game: page(), t: f.serverTimestamp(), ua: navigator.userAgent.slice(0, 120) });
        if (!d) return;
        f.updateDoc(ref, { lastSeen: f.serverTimestamp() });
        if (d.banned) {
          try { window.stop(); } catch (e) {}
          document.body.innerHTML = '';
          overlay(box('#ff6b6b', '<p style="margin:0 0 10px;font-size:22px;font-weight:bold;color:#ff6b6b">このサイトは使えません</p><p style="margin:0;font-size:16px">管理者によって、この端末の利用が停止されました。<br>学校の端末では遊ばないルールを守ってください。</p><p style="margin:14px 0 0;font-size:12px;color:#a8b2d8">ID: ' + esc(id) + '</p>'));
          return;
        }
        if ((d.warnings || 0) > (d.ackWarnings || 0)) {
          overlay(box('#ffd34d', '<p style="margin:0 0 10px;font-size:22px;font-weight:bold;color:#ffd34d">⚠ 管理者からの警告（' + d.warnings + '回目）</p><p style="margin:0 0 18px;font-size:16px;text-align:left">' + esc(d.warnText || '学校の端末では遊ばないでください。') + '</p><button type="button" style="font:bold 16px inherit;font-family:inherit;color:#0b1020;background:#ffd34d;border:0;padding:10px 22px;cursor:pointer;box-shadow:3px 3px 0 #000">読みました</button>'),
            function () { f.updateDoc(ref, { ackWarnings: d.warnings }); });
        }
      });
      });
    }).catch(function () { /* 記録できなくてもゲームは遊べる */ });
  }
  var started = false;
  function go() { if (started) return; started = true; run(); }
  if (shown()) go(); else document.addEventListener('sgl-notice-ok', go);
})();
