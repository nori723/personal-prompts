# Generate the JinNang icon: vermilion rounded square + white CJK glyph.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-icon.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root "icons"
if (-not (Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir | Out-Null
}

$background = [System.Drawing.Color]::FromArgb(232, 67, 46)
# U+63D0 = CJK glyph used as the brand mark
$glyph = [string][char]0x63D0

function New-Icon {
    param([int]$Size, [string]$Path)

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Rounded-square background, corner ratio matches the SVG mock (rx = 11/48).
    $radius = $Size * (11 / 48)
    $diameter = $radius * 2
    $roundPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $roundPath.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $roundPath.AddArc($Size - $diameter - 1, 0, $diameter, $diameter, 270, 90)
    $roundPath.AddArc($Size - $diameter - 1, $Size - $diameter - 1, $diameter, $diameter, 0, 90)
    $roundPath.AddArc(0, $Size - $diameter - 1, $diameter, $diameter, 90, 90)
    $roundPath.CloseFigure()

    $brush = New-Object System.Drawing.SolidBrush($background)
    $graphics.FillPath($brush, $roundPath)

    $fontSize = $Size * 0.58
    $font = New-Object System.Drawing.Font("Microsoft YaHei UI", $fontSize,
        [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $white = [System.Drawing.Brushes]::White
    $rect = New-Object System.Drawing.RectangleF(0, ($Size * 0.02), $Size, $Size)
    $graphics.DrawString($glyph, $font, $white, $rect, $format)

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $font.Dispose()
    $brush.Dispose()
    $roundPath.Dispose()
    $bitmap.Dispose()
    Write-Host ("generated {0} ({1} px)" -f $Path, $Size)
}

New-Icon -Size 16  -Path (Join-Path $iconDir "icon16.png")
New-Icon -Size 32  -Path (Join-Path $iconDir "icon32.png")
New-Icon -Size 48  -Path (Join-Path $iconDir "icon48.png")
New-Icon -Size 128 -Path (Join-Path $iconDir "icon128.png")

Write-Host "done"
