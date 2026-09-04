// Read an admin password without putting it in shell history or argv.
// Set MUSEUM_ADMIN_PASSWORD for non-interactive runs (CI/local automation).

export async function readAdminPassword() {
  const fromEnv = process.env.MUSEUM_ADMIN_PASSWORD;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;

  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Hãy đặt biến môi trường MUSEUM_ADMIN_PASSWORD khi chạy non-interactive.');
  }

  const stdin = process.stdin;
  const stdout = process.stdout;
  stdout.write('Mật khẩu admin (không hiển thị): ');
  stdin.setEncoding('utf8');
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let password = '';

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };

    const onData = chunk => {
      for (const char of chunk) {
        if (char === '\u0003' || char === '\u0004') {
          cleanup();
          reject(new Error('Đã hủy nhập mật khẩu.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          resolve(password);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (password.length > 0) password = password.slice(0, -1);
          continue;
        }
        password += char;
      }
    };

    stdin.on('data', onData);
  });
}
