# Level 5 integration for Aventure Gourmande. ASCII-only for Windows PowerShell 5.1.
# Run from the project root, where package.json lives.
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$mainPath = Join-Path $root 'src/main.ts'
$menuPath = Join-Path $root 'src/scenes/MenuScene.ts'
$level4Path = Join-Path $root 'src/scenes/Level4Scene.ts'
$level5Path = Join-Path $root 'src/scenes/Level5Scene.ts'
foreach ($path in @($mainPath, $menuPath, $level4Path, $level5Path)) {
  if (-not (Test-Path $path)) { throw "Missing required file: $path" }
}
$main = [System.IO.File]::ReadAllText($mainPath).Replace("`r`n", "`n")
$menu = [System.IO.File]::ReadAllText($menuPath).Replace("`r`n", "`n")
$level4 = [System.IO.File]::ReadAllText($level4Path).Replace("`r`n", "`n")
function Replace-Once([string]$source, [string]$old, [string]$replacement, [string]$label) {
  $count = ([regex]::Matches($source, [regex]::Escape($old))).Count
  if ($count -ne 1) { throw "$label : expected 1 match, found $count. No files changed." }
  return $source.Replace($old, $replacement)
}
# Work out all changes in memory before writing any files.
if ($main -notmatch 'import \{ Level5Scene \}') {
  $oldImport = "import { Level4Scene } from './scenes/Level4Scene';"
  $newImport = $oldImport + "`n" + "import { Level5Scene } from './scenes/Level5Scene';"
  $main = Replace-Once $main $oldImport $newImport 'main.ts import'
}
if ($main -notmatch 'Level4Scene, Level5Scene\]') {
  $main = Replace-Once $main 'Level4Scene],' 'Level4Scene, Level5Scene],' 'main.ts scene array'
}
if ($menu -notmatch 'this.scene.start\("Level5Scene"\)') {
  $anchor = '    this.add' + "`n" + '      .text(width * 0.39, height - 25,'
  $insert = @'
    if (this.registry.get("level4Complete") === true) {
      this.createButton(buttonX, 570, "NIVEAU 5", 0xd38cad, () =>
        this.scene.start("Level5Scene"),
      );
    }

'@
  $menu = Replace-Once $menu $anchor ($insert + $anchor) 'MenuScene.ts level 5 button'
}
if ($level4 -notmatch "this.scene.start\('Level5Scene'\)") {
  $old = "      [['Retour au menu', () => this.scene.start('MenuScene')]," + "`n" + "        ['Rejouer le niveau', () => this.scene.restart()]], 'memory-medallion');"
  # The arrow is represented by a Unicode code point rather than encoded into this PS1.
  $nextLabel = 'NIVEAU SUIVANT ' + [char]0x2192
  $new = "      [['$nextLabel', () => this.scene.start('Level5Scene')]," + "`n" + $old.Replace("      [[", "        [")
  $level4 = Replace-Once $level4 $old $new 'Level4Scene.ts victory transition'
}
# Back up before changing the existing TypeScript files.
foreach ($path in @($mainPath, $menuPath, $level4Path)) {
  Copy-Item -LiteralPath $path -Destination ($path + '.level5-backup') -Force
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($mainPath, $main, $utf8)
[System.IO.File]::WriteAllText($menuPath, $menu, $utf8)
[System.IO.File]::WriteAllText($level4Path, $level4, $utf8)
Write-Host 'Level 5 integration complete. Backup files have suffix .level5-backup.' -ForegroundColor Green
Write-Host 'Next: npm run build'