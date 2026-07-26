param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function New-Brush([string]$hex) {
    return [System.Drawing.SolidBrush]::new(
        [System.Drawing.ColorTranslator]::FromHtml($hex)
    )
}

function Add-Polygon($graphics, [string]$color, [int[][]]$coordinates) {
    $points = foreach ($coordinate in $coordinates) {
        [System.Drawing.Point]::new(
            [int]($coordinate[0]),
            [int]($coordinate[1])
        )
    }
    $brush = New-Brush $color
    try {
        $graphics.FillPolygon($brush, $points)
    } finally {
        $brush.Dispose()
    }
}

function Add-Rectangle($graphics, [string]$color, [int]$x, [int]$y, [int]$width, [int]$height) {
    $brush = New-Brush $color
    try {
        $graphics.FillRectangle($brush, $x, $y, $width, $height)
    } finally {
        $brush.Dispose()
    }
}

function Add-Diamond($graphics, [string]$color, [int]$centerX, [int]$centerY, [int]$radius) {
    Add-Polygon -graphics $graphics -color $color -coordinates @(
        @($centerX, ($centerY - $radius)),
        @(($centerX + $radius), $centerY),
        @($centerX, ($centerY + $radius)),
        @(($centerX - $radius), $centerY)
    )
}

function Add-BeveledCell($graphics, [int]$x, [int]$y, [int]$size, [string]$accent) {
    $cut = [Math]::Max(2, [int]($size / 6))
    Add-Polygon -graphics $graphics -color "#29263d" -coordinates @(
        @(($x + $cut), $y),
        @(($x + $size - $cut), $y),
        @(($x + $size), ($y + $cut)),
        @(($x + $size), ($y + $size - $cut)),
        @(($x + $size - $cut), ($y + $size)),
        @(($x + $cut), ($y + $size)),
        @($x, ($y + $size - $cut)),
        @($x, ($y + $cut))
    )
    Add-Rectangle $graphics "#666a7e" ($x + $cut) ($y + $cut) ($size - $cut * 2) ($size - $cut * 2)
    Add-Rectangle $graphics "#8d91a5" ($x + $cut + 2) ($y + $cut + 2) ($size - $cut * 2 - 4) 3
    Add-Diamond -graphics $graphics -color $accent `
        -centerX ($x + [int]($size / 2)) `
        -centerY ($y + [int]($size / 2)) `
        -radius ([Math]::Max(2, [int]($size / 6)))
}

function New-MagneticCopperWarehouse([string]$path) {
    $bitmap = [System.Drawing.Bitmap]::new(
        64,
        64,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy

    Add-Polygon $graphics "#242235" @(
        @(5, 0), @(59, 0), @(64, 5), @(64, 59),
        @(59, 64), @(5, 64), @(0, 59), @(0, 5)
    )
    Add-Polygon $graphics "#7350ed" @(
        @(7, 2), @(57, 2), @(62, 7), @(62, 57),
        @(57, 62), @(7, 62), @(2, 57), @(2, 7)
    )
    Add-Polygon $graphics "#4e5063" @(
        @(9, 6), @(55, 6), @(58, 9), @(58, 55),
        @(55, 58), @(9, 58), @(6, 55), @(6, 9)
    )

    foreach ($cell in @(@(8, 8), @(38, 8), @(8, 38), @(38, 38))) {
        Add-BeveledCell -graphics $graphics -x ([int]($cell[0])) -y ([int]($cell[1])) -size 18 -accent "#c77b67"
    }

    Add-Rectangle $graphics "#c77b67" 28 3 8 8
    Add-Rectangle $graphics "#c77b67" 28 53 8 8
    Add-Rectangle $graphics "#c77b67" 3 28 8 8
    Add-Rectangle $graphics "#c77b67" 53 28 8 8

    Add-Diamond -graphics $graphics -color "#26213c" -centerX 32 -centerY 32 -radius 20
    Add-Diamond -graphics $graphics -color "#5e3fd2" -centerX 32 -centerY 32 -radius 16
    Add-Diamond -graphics $graphics -color "#989bad" -centerX 32 -centerY 32 -radius 12
    Add-Diamond -graphics $graphics -color "#30284f" -centerX 32 -centerY 32 -radius 8
    Add-Diamond -graphics $graphics -color "#8f53fb" -centerX 32 -centerY 32 -radius 5
    Add-Diamond -graphics $graphics -color "#c8b8ff" -centerX 32 -centerY 32 -radius 2

    $graphics.Dispose()
    try {
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $bitmap.Dispose()
    }
}

function New-MagneticSurgeWarehouse([string]$path) {
    $bitmap = [System.Drawing.Bitmap]::new(
        128,
        128,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy

    Add-Polygon $graphics "#1d1b2e" @(
        @(8, 0), @(120, 0), @(128, 8), @(128, 120),
        @(120, 128), @(8, 128), @(0, 120), @(0, 8)
    )
    Add-Polygon $graphics "#4b2fb1" @(
        @(10, 3), @(118, 3), @(125, 10), @(125, 118),
        @(118, 125), @(10, 125), @(3, 118), @(3, 10)
    )
    Add-Polygon $graphics "#666a80" @(
        @(14, 8), @(114, 8), @(120, 14), @(120, 114),
        @(114, 120), @(14, 120), @(8, 114), @(8, 14)
    )
    Add-Polygon $graphics "#29273d" @(
        @(20, 13), @(108, 13), @(115, 20), @(115, 108),
        @(108, 115), @(20, 115), @(13, 108), @(13, 20)
    )

    foreach ($cell in @(
        @(18, 18), @(48, 18), @(80, 18),
        @(18, 48),             @(80, 48),
        @(18, 80), @(48, 80), @(80, 80)
    )) {
        Add-BeveledCell -graphics $graphics -x ([int]($cell[0])) -y ([int]($cell[1])) -size 28 -accent "#8f53fb"
    }

    Add-Rectangle $graphics "#aeb4c7" 57 8 14 24
    Add-Rectangle $graphics "#6f45e8" 61 8 6 24
    Add-Rectangle $graphics "#aeb4c7" 57 96 14 24
    Add-Rectangle $graphics "#6f45e8" 61 96 6 24
    Add-Rectangle $graphics "#aeb4c7" 8 57 24 14
    Add-Rectangle $graphics "#6f45e8" 8 61 24 6
    Add-Rectangle $graphics "#aeb4c7" 96 57 24 14
    Add-Rectangle $graphics "#6f45e8" 96 61 24 6

    Add-Diamond -graphics $graphics -color "#171426" -centerX 64 -centerY 64 -radius 31
    Add-Diamond -graphics $graphics -color "#40268f" -centerX 64 -centerY 64 -radius 26
    Add-Diamond -graphics $graphics -color "#c77b67" -centerX 64 -centerY 64 -radius 21
    Add-Diamond -graphics $graphics -color "#5c6075" -centerX 64 -centerY 64 -radius 17
    Add-Diamond -graphics $graphics -color "#28213f" -centerX 64 -centerY 64 -radius 12
    Add-Diamond -graphics $graphics -color "#8f53fb" -centerX 64 -centerY 64 -radius 8
    Add-Diamond -graphics $graphics -color "#d8ccff" -centerX 64 -centerY 64 -radius 3

    foreach ($offset in 0, 1, 2) {
        Add-Rectangle $graphics "#8f53fb" (25 + $offset * 39) 3 8 5
        Add-Rectangle $graphics "#8f53fb" (25 + $offset * 39) 120 8 5
        Add-Rectangle $graphics "#8f53fb" 3 (25 + $offset * 39) 5 8
        Add-Rectangle $graphics "#8f53fb" 120 (25 + $offset * 39) 5 8
    }

    $graphics.Dispose()
    try {
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $bitmap.Dispose()
    }
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$magneticCopperName = (-join [char[]]@(0x78c1, 0x94dc, 0x538b, 0x7f29, 0x4ed3, 0x5e93)) + ".png"
$magneticSurgeName = (-join [char[]]@(0x78c1, 0x6d8c, 0x6269, 0x5c55, 0x4ed3, 0x5e93)) + ".png"
New-MagneticCopperWarehouse (Join-Path $OutputDirectory $magneticCopperName)
New-MagneticSurgeWarehouse (Join-Path $OutputDirectory $magneticSurgeName)
