(() => {
  'use strict';
  let registering = false,
    session = null;
  const $ = (id) => document.getElementById(id),
    message = (t) => {
      $('authError').textContent = t;
    };
  async function request(url, data) {
    const r = await fetch(url, {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { 'X-CSRF-Token': session.csrfToken } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.message || b.code);
    return b;
  }
  function tab(mode) {
    registering = mode;
    $('nameField').hidden = !mode;
    $('displayName').required = mode;
    $('codeField').hidden = mode;
    $('submitAuth').textContent = mode ? 'Tạo tài khoản' : 'Đăng nhập';
    message('');
  }
  $('tabLogin').onclick = () => tab(false);
  $('tabRegister').onclick = () => tab(true);
  $('authForm').onsubmit = async (e) => {
    e.preventDefault();
    $('submitAuth').disabled = true;
    try {
      await request('/api/auth/' + (registering ? 'register' : 'login'), {
        login: $('login').value,
        password: $('password').value,
        ...(registering ? { displayName: $('displayName').value } : { code: $('code').value }),
      });
      location.href = location.pathname.startsWith('/admin') ? '/admin' : '/';
    } catch (e) {
      message(e.message);
    } finally {
      $('submitAuth').disabled = false;
    }
  };
  function button(parent, label, fn) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    parent.append(b);
    return b;
  }
  function field(parent, label, type = 'text') {
    const l = document.createElement('label'),
      s = document.createElement('span'),
      i = document.createElement('input');
    s.textContent = label;
    i.type = type;
    l.append(s, i);
    parent.append(l);
    return i;
  }
  request('/api/auth/me')
    .then((data) => {
      session = data;
      $('authForm').hidden = true;
      $('tabLogin').parentElement.hidden = true;
      const a = $('accountActions');
      a.hidden = false;
      const h = document.createElement('h2');
      h.textContent = data.user.displayName;
      a.append(h);
      const p = document.createElement('p');
      p.textContent = 'Bạn đã đăng nhập. Tiến độ được lưu trong PostgreSQL.';
      a.append(p);
      const link = document.createElement('a');
      link.href = '/';
      link.className = 'button';
      link.textContent = 'Tiếp tục chơi';
      a.append(link);
      if (data.user.roles.some((r) => r !== 'PLAYER')) {
        const admin = document.createElement('a');
        admin.href = '/admin';
        admin.textContent = ' Trang quản trị →';
        a.append(admin);
      }
      button(a, 'Thiết lập / thay MFA', () => {
        const box = document.createElement('div');
        const pass = field(box, 'Mật khẩu hiện tại', 'password'),
          code = field(box, 'Mã MFA hiện tại (nếu đã bật)');
        button(box, 'Tạo khóa MFA', async () => {
          try {
            const setup = await request('/api/auth/mfa/setup', {
              password: pass.value,
              code: code.value,
            });
            box.replaceChildren();
            const warn = document.createElement('p');
            warn.textContent = 'Thêm khóa này vào ứng dụng Authenticator. Không chia sẻ khóa.';
            const pre = document.createElement('pre');
            pre.textContent = setup.secret;
            box.append(warn, pre);
            const confirm = field(box, 'Mã 6 số trong ứng dụng');
            button(box, 'Xác nhận bật MFA', async () => {
              try {
                await request('/api/auth/mfa/confirm', { code: confirm.value });
                box.textContent = 'MFA đã bật.';
              } catch (e) {
                message(e.message);
              }
            });
          } catch (e) {
            message(e.message);
          }
        });
        a.append(box);
      });
      button(a, 'Nhập dữ liệu chơi thử trên máy này (demo)', async () => {
        try {
          if (
            !confirm(
              'Nhập một lần dữ liệu demo vào tài khoản? Bản local gốc sẽ được giữ. Chức năng này tắt trong production.',
            )
          )
            return;
          const raw =
            localStorage.getItem('giao-xu-an-hoa-2d-v3') ||
            localStorage.getItem('giao-xu-an-hoa-2d-v2');
          if (!raw) throw Error('Không có dữ liệu demo trên trình duyệt.');
          const r = await fetch('/api/demo/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': session.csrfToken,
              'Idempotency-Key': crypto.randomUUID(),
            },
            body: raw,
          });
          const b = await r.json();
          if (!r.ok) throw Error(b.message || b.code);
          message('Đã nhập demo và lưu trên máy chủ. Bản gốc vẫn được giữ.');
        } catch (e) {
          message(e.message);
        }
      });
      button(a, 'Đổi mật khẩu', () => {
        const box = document.createElement('div'),
          old = field(box, 'Mật khẩu hiện tại', 'password'),
          next = field(box, 'Mật khẩu mới (12 ký tự trở lên)', 'password'),
          code = field(box, 'Mã MFA (nếu đã bật)');
        button(box, 'Đổi và đăng xuất tất cả phiên', async () => {
          try {
            await request('/api/auth/password', {
              currentPassword: old.value,
              password: next.value,
              code: code.value,
            });
            location.reload();
          } catch (e) {
            message(e.message);
          }
        });
        a.append(box);
      });
      button(a, 'Đăng xuất', async () => {
        await request('/api/auth/logout', {});
        location.href = '/account';
      });
    })
    .catch(() => {});
})();
