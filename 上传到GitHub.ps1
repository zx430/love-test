$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if ($gitCommand) { $gitExe = $gitCommand.Source } else { $gitExe = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe' }
if (!(Test-Path -LiteralPath $gitExe)) { throw '请先安装 Git for Windows。' }
if ($gitExe -like '*codex-primary-runtime*') { $env:GIT_EXEC_PATH = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\mingw64\bin' }
function Invoke-ProjectGit { & $gitExe @args; if ($LASTEXITCODE -ne 0) { throw 'Git 操作失败，已停止。请查看上方错误，不会删除项目文件。' } }
try {
  $authorName = & $gitExe config user.name
  $authorEmail = & $gitExe config user.email
  if (!$authorName) { $authorName = Read-Host '请输入 Git 提交作者名称'; if (!$authorName) { throw '名称不能为空' }; Invoke-ProjectGit config user.name $authorName }
  if (!$authorEmail) { $authorEmail = Read-Host '请输入 Git 提交邮箱（可使用 GitHub Settings / Emails 中的 noreply 邮箱）'; if (!$authorEmail) { throw '邮箱不能为空' }; Invoke-ProjectGit config user.email $authorEmail }
  $remotes = & $gitExe remote
  if ($remotes -contains 'origin') { $origin = & $gitExe remote get-url origin; if ($origin -ne 'https://github.com/zx430/love-test.git') { throw 'origin 指向其他仓库，请先人工检查。' } } else { Invoke-ProjectGit remote add origin https://github.com/zx430/love-test.git }
  Invoke-ProjectGit branch -M main
  Invoke-ProjectGit add .
  & $gitExe diff --cached --quiet
  if ($LASTEXITCODE -eq 1) { Invoke-ProjectGit commit -m 'Initial release: relationship test with GitHub Pages deployment' }
  Invoke-ProjectGit -c http.sslBackend=openssl push -u origin main
  Write-Host '上传成功。请进入仓库 Settings > Pages，将 Source 选择为 GitHub Actions。'
} catch { Write-Host $_ -ForegroundColor Red }
Read-Host '按 Enter 退出'

