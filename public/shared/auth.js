(() => {
  'use strict';
  let registering = false,
    session = null,
    lastActionButton = null;
  const $ = (id) => document.getElementById(id);
  const messages = {
    ACCOUNT_HAS_PROGRESS:
      'Tài khoản đã có tiến độ. Giữ nguyên dữ liệu hiện tại; chỉ nhập demo vào tài khoản mới chưa chơi.',
    ALREADY_IMPORTED: 'Tài khoản đã nhập demo một lần.',
    IMPORT_PREVIEW_STALE: 'Tài khoản đã thay đổi. Hãy xem trước lại trước khi nhập.',
    DEMO_SAVE_NEEDS_REVIEW: 'Dữ liệu demo cần được kiểm tra; bản gốc vẫn được giữ.',
    INVALID_CREDENTIALS: 'Tài khoản, mật khẩu hoặc mã xác thực chưa đúng.',
    MFA_INVALID: 'Mã xác thực chưa đúng.',
    PASSWORD_REQUIRED: 'Vui lòng kiểm tra mật khẩu hiện tại.',
    LOGIN_REQUIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    DISABLED: 'Tính năng này hiện không được bật.',
    RATE_LIMITED: 'Bạn đang thao tác quá nhanh. Vui lòng chờ trước khi thử lại.',
  };
  const message = (t) => {
    const text = messages[t] || t,
      panel = $('settingsPanel');
    if (text && panel && !panel.hidden) {
      let error = panel.querySelector('.settings-error');
      if (!error) {
        error = document.createElement('p');
        error.className = 'error settings-error';
        error.setAttribute('role', 'alert');
        panel.append(error);
      }
      error.textContent = text;
      $('authError').textContent = '';
      error.scrollIntoView({ block: 'center' });
    } else {
      $('authError').textContent = text;
      panel?.querySelector('.settings-error')?.remove();
    }
  };
  async function request(url, data, extra = {}) {
    let r;
    try {
      r = await fetch(url, {
        method: data === undefined ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'X-CSRF-Token': session.csrfToken } : {}),
          ...extra,
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      if ($('syncState')) $('syncState').textContent = 'Chưa thể kết nối máy chủ.';
      throw Error('Không thể kết nối. Kiểm tra mạng rồi thử lại.');
    }
    const b = await r.json();
    if (!r.ok) {
      if (r.status === 401 && session) guest();
      const e = Error(b.message || b.code);
      e.status = r.status;
      throw e;
    }
    return b;
  }
  function tab(mode) {
    registering = mode;
    $('nameField').hidden = !mode;
    $('displayName').required = mode;
    $('codeField').hidden = mode;
    $('submitAuth').textContent = mode ? 'Tạo tài khoản' : 'Đăng nhập';
    $('password').autocomplete = mode ? 'new-password' : 'current-password';
    for (const [id, active] of [
      ['tabLogin', !mode],
      ['tabRegister', mode],
    ]) {
      $(id).classList.toggle('secondary', !active);
      $(id).setAttribute('aria-pressed', String(active));
    }
    message('');
  }
  function guest() {
    session = null;
    $('authLoading').hidden = true;
    $('retrySession').hidden = true;
    $('accountActions').hidden = true;
    $('accountActions').replaceChildren();
    $('authTabs').hidden = false;
    $('authForm').hidden = false;
    $('accountTitle').textContent = 'Đăng nhập để lưu hành trình';
  }
  function button(parent, label, fn, id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (id) b.id = id;
    b.onclick = async () => {
      lastActionButton = b;
      b.disabled = true;
      message('');
      try {
        await fn();
      } catch (e) {
        message(e.message);
      } finally {
        b.disabled = false;
      }
    };
    parent.append(b);
    return b;
  }
  function field(parent, label, type = 'text') {
    const l = document.createElement('label'),
      s = document.createElement('span'),
      i = document.createElement('input');
    s.textContent = label;
    i.type = type;
    i.autocomplete = type === 'password' ? 'current-password' : 'one-time-code';
    l.append(s, i);
    parent.append(l);
    return i;
  }
  let settingsReturn = null;
  function closeSettings() {
    const box = $('settingsPanel');
    if (!box) return;
    box.hidden = true;
    box.replaceChildren();
    settingsReturn?.focus();
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('settingsPanel') && !$('settingsPanel').hidden) {
      e.preventDefault();
      closeSettings();
    }
  });
  function panel(title) {
    settingsReturn = lastActionButton || document.activeElement;
    const box = $('settingsPanel');
    box.replaceChildren();
    box.hidden = false;
    const h = document.createElement('h3');
    h.textContent = title;
    box.append(h);
    button(box, 'Đóng', () => {
      box.hidden = true;
      box.replaceChildren();
      document.getElementById('securityMfa')?.focus();
    });
    return box;
  }
  const announceAuth = () => {
    try {
      localStorage.setItem('anhoa:auth-event', crypto.randomUUID());
    } catch {}
  };
  $('tabLogin').onclick = () => tab(false);
  $('tabRegister').onclick = () => tab(true);
  tab(false);
  $('authForm').onsubmit = async (e) => {
    e.preventDefault();
    $('submitAuth').disabled = true;
    message('');
    try {
      await request('/api/auth/' + (registering ? 'register' : 'login'), {
        login: $('login').value,
        password: $('password').value,
        ...(registering ? { displayName: $('displayName').value } : { code: $('code').value }),
      });
      announceAuth();
      location.href = location.pathname.startsWith('/admin') ? '/admin' : '/';
    } catch (e) {
      message(e.message);
    } finally {
      $('submitAuth').disabled = false;
    }
  };
  function signedIn(data) {
    session = data;
    $('authLoading').hidden = true;
    $('retrySession').hidden = true;
    $('authForm').hidden = true;
    $('authTabs').hidden = true;
    $('accountTitle').textContent = 'Chào mừng trở lại, ' + data.user.displayName;
    const a = $('accountActions');
    a.replaceChildren();
    a.hidden = false;
    const p = document.createElement('p');
    p.id = 'syncState';
    p.className = 'muted';
    p.textContent = 'Tài khoản đã được xác thực trên máy chủ.';
    a.append(p);
    const link = document.createElement('a');
    link.id = 'continueGame';
    link.href = '/';
    link.className = 'button account-primary';
    link.textContent = 'Tiếp tục chơi';
    a.append(link);
    if (data.user.roles.some((r) => r !== 'PLAYER')) {
      const admin = document.createElement('a');
      admin.href = '/admin';
      admin.textContent = 'Mở trang quản trị';
      admin.className = 'account-admin';
      a.append(admin);
    }
    const section = document.createElement('section');
    section.className = 'account-section';
    section.innerHTML =
      '<h2>Tài khoản & bảo mật</h2><p class="muted">Quản lý mật khẩu và xác thực hai bước.</p><div class="account-actions"></div>';
    a.append(section);
    const actions = section.lastElementChild;
    button(
      actions,
      'Thiết lập / thay MFA',
      () => {
        const box = panel('Xác thực hai bước'),
          pass = field(box, 'Mật khẩu hiện tại', 'password'),
          code = field(box, 'Mã MFA hiện tại (nếu đã bật)');
        button(box, 'Tạo khóa MFA', async () => {
          const setup = await request('/api/auth/mfa/setup', {
            password: pass.value,
            code: code.value,
          });
          box.replaceChildren();
          const warn = document.createElement('p'),
            pre = document.createElement('pre');
          warn.textContent = 'Thêm khóa vào ứng dụng Authenticator. Không chia sẻ khóa.';
          pre.textContent = setup.secret;
          box.append(warn, pre);
          const confirm = field(box, 'Mã 6 số trong ứng dụng');
          button(box, 'Xác nhận bật MFA', async () => {
            await request('/api/auth/mfa/confirm', { code: confirm.value });
            box.textContent = 'MFA đã bật.';
          });
          button(box, 'Đóng', () => {
            box.replaceChildren();
            box.hidden = true;
          });
        });
        pass.focus();
      },
      'securityMfa',
    ).className = 'secondary';
    button(
      actions,
      'Đổi mật khẩu',
      () => {
        const box = panel('Đổi mật khẩu'),
          old = field(box, 'Mật khẩu hiện tại', 'password'),
          next = field(box, 'Mật khẩu mới (12 ký tự trở lên)', 'password'),
          code = field(box, 'Mã MFA (nếu đã bật)');
        next.autocomplete = 'new-password';
        button(box, 'Đổi và đăng xuất tất cả phiên', async () => {
          await request('/api/auth/password', {
            currentPassword: old.value,
            password: next.value,
            code: code.value,
          });
          announceAuth();
          location.reload();
        });
        old.focus();
      },
      'changePassword',
    ).className = 'secondary';
    const settings = document.createElement('section');
    settings.id = 'settingsPanel';
    settings.className = 'account-section';
    settings.hidden = true;
    a.append(settings);
    const raw =
      localStorage.getItem('giao-xu-an-hoa-2d-v3') ?? localStorage.getItem('giao-xu-an-hoa-2d-v2');
    if (raw !== null && data.demoImportEnabled) {
      const imp = document.createElement('section');
      imp.className = 'account-section';
      imp.innerHTML =
        '<h2>Nhập tiến độ chơi thử</h2><p class="muted">Tùy chọn dành cho tài khoản mới chưa chơi. Xem trước tác động; dữ liệu demo trên máy vẫn được giữ. Không gộp Xu hay ghi đè tiến độ tài khoản đã chơi.</p>';
      a.append(imp);
      button(
        imp,
        'Xem trước dữ liệu demo',
        async () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            throw Error('Dữ liệu demo không đọc được. Bản gốc vẫn được giữ nguyên.');
          }
          const preview = await request('/api/demo/preview', parsed),
            box = panel('Xem trước nhập demo');
          const desc = document.createElement('p');
          desc.id = 'importSummary';
          desc.textContent = `Tài khoản: ${preview.account.coins} Xu, ${preview.account.inventory} trang phục, ${preview.account.claimed} nhiệm vụ đã nhận thưởng. Demo: ${preview.demo.coins} Xu, ${preview.demo.inventory} trang phục, ${preview.demo.claimed} nhiệm vụ đã nhận thưởng.`;
          box.append(desc);
          if (!preview.allowed) {
            const why = document.createElement('p');
            why.textContent = messages[preview.reason] || preview.reason;
            box.append(why);
            return;
          }
          const label = document.createElement('label'),
            check = document.createElement('input');
          check.type = 'checkbox';
          check.id = 'confirmImport';
          label.append(
            check,
            document.createTextNode(
              ' Tôi hiểu demo sẽ thay tiến độ khởi tạo của tài khoản mới; không cộng hai số dư.',
            ),
          );
          box.append(label);
          const key = crypto.randomUUID();
          button(
            box,
            'Xác nhận nhập một lần',
            async () => {
              if (!check.checked) throw Error('Hãy đọc và xác nhận tác động trước khi nhập.');
              await request('/api/demo/import', parsed, {
                'Idempotency-Key': key,
                'If-Match': String(preview.accountVersion),
              });
              box.replaceChildren();
              box.textContent = 'Đã nhập demo lên máy chủ. Dữ liệu gốc trên máy vẫn được giữ.';
            },
            'applyImport',
          );
        },
        'previewImport',
      ).className = 'secondary';
    }
    const logout = document.createElement('div');
    logout.className = 'account-section';
    a.append(logout);
    button(
      logout,
      'Đăng xuất',
      async () => {
        await request('/api/auth/logout', {});
        announceAuth();
        location.href = '/account';
      },
      'logout',
    ).className = 'secondary';
  }
  async function refreshSession() {
    try {
      const data = await request('/api/auth/me');
      if (!session || session.user.id !== data.user.id || $('accountActions').hidden)
        signedIn(data);
      else session = data;
    } catch (e) {
      if (e.status === 401) guest();
      else {
        $('authLoading').textContent = 'Chưa thể kiểm tra phiên đăng nhập.';
        $('retrySession').hidden = false;
        message(e.message);
      }
    }
  }
  $('retrySession').onclick = refreshSession;
  window.addEventListener('storage', (e) => {
    if (e.key === 'anhoa:auth-event') refreshSession();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshSession();
  });
  refreshSession();
})();
