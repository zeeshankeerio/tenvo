param([string]$Path, [int]$Max = 4000)
$lines = Get-Content $Path
foreach ($ln in $lines) {
  if (-not $ln.Trim()) { continue }
  try { $o = $ln | ConvertFrom-Json } catch { continue }
  $role = $o.role
  $content = $o.message.content
  $texts = @()
  if ($content -is [string]) { $texts += $content }
  else {
    foreach ($b in $content) {
      if ($null -eq $b) { continue }
      if ($b -is [string]) { $texts += $b; continue }
      $t = $b.type
      if ($t -eq 'text' -and $b.text) { $texts += $b.text }
      elseif ($t -eq 'tool_result') {
        $tc = $b.content
        if ($tc -is [string]) { $texts += "[tool_result] " + $tc }
        elseif ($tc) { foreach($x in $tc){ if($x.text){ $texts += "[tool_result] " + $x.text } } }
      }
    }
  }
  $joined = ($texts -join "`n").Trim()
  if (-not $joined) { continue }
  if ($joined.Length -gt $Max) { $joined = $joined.Substring(0,$Max) + " ...[truncated]" }
  Write-Output ("==== {0} ====" -f $role.ToUpper())
  Write-Output $joined
  Write-Output ""
}
