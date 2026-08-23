/**
 * Force-stop whatever is listening on this site's fixed Jekyll port (4002).
 *
 * Same Get-NetTCPConnection + Stop-Process pipeline as the pre-commit hook.
 * Non-fatal if nothing is listening. Port-scoped so sibling sites stay up.
 *
 * Run from the site root: npm run serve:stop
 */
import { spawnSync } from 'node:child_process';

const PORT = 4002;

const killCommand =
  `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue` +
  ' | Select-Object -Expand OwningProcess -Unique' +
  ' | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }';

spawnSync('powershell.exe', ['-NoProfile', '-Command', killCommand], {
  stdio: 'ignore',
});

// Match the pre-commit hook: wait for the just-terminated server to release the port.
spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Start-Sleep -Seconds 1'], {
  stdio: 'ignore',
});
