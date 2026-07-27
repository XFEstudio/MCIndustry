param(
    [Parameter(Mandatory = $true)]
    [string]$BorderPath,

    [Parameter(Mandatory = $true)]
    [string]$CornerPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$palette = @{
    Background  = [System.Drawing.ColorTranslator]::FromHtml('#2b2244')
    CornerShadow = [System.Drawing.ColorTranslator]::FromHtml('#302748')
    CornerOuter  = [System.Drawing.ColorTranslator]::FromHtml('#595155')
    CornerInner  = [System.Drawing.ColorTranslator]::FromHtml('#6b5f86')
    CornerLight  = [System.Drawing.ColorTranslator]::FromHtml('#75688e')
    InnerDark   = [System.Drawing.ColorTranslator]::FromHtml('#24183d')
    InnerGlow   = [System.Drawing.ColorTranslator]::FromHtml('#9a63f0')
    Purple      = [System.Drawing.ColorTranslator]::FromHtml('#6339ad')
    CopperDark  = [System.Drawing.ColorTranslator]::FromHtml('#704039')
    Copper      = [System.Drawing.ColorTranslator]::FromHtml('#b96959')
    CopperGlow  = [System.Drawing.ColorTranslator]::FromHtml('#dc8b6d')
    OuterDark   = [System.Drawing.ColorTranslator]::FromHtml('#472b32')
}

$border = [System.Drawing.Bitmap]::new(
    5,
    32,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)

try {
    for ($y = 0; $y -lt $border.Height; $y++) {
        $phase = $y % 8

        $border.SetPixel(0, $y, $palette.InnerDark)
        $border.SetPixel(
            1,
            $y,
            $(if ($phase -eq 2) { $palette.InnerGlow } else { $palette.Purple })
        )
        $border.SetPixel(2, $y, $palette.CopperDark)
        $border.SetPixel(
            3,
            $y,
            $(if ($phase -eq 5) { $palette.CopperGlow } else { $palette.Copper })
        )
        $border.SetPixel(4, $y, $palette.OuterDark)
    }

    $resolvedBorderDirectory = [System.IO.Path]::GetFullPath(
        (Split-Path -Parent $BorderPath)
    )
    [System.IO.Directory]::CreateDirectory($resolvedBorderDirectory) | Out-Null
    $border.Save(
        [System.IO.Path]::GetFullPath($BorderPath),
        [System.Drawing.Imaging.ImageFormat]::Png
    )
} finally {
    $border.Dispose()
}

$corner = [System.Drawing.Bitmap]::new(
    32,
    32,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)

try {
    for ($y = 0; $y -lt $corner.Height; $y++) {
        for ($x = 0; $x -lt $corner.Width; $x++) {
            $corner.SetPixel($x, $y, $palette.Background)

            $pixelX = $x + 0.5
            $pixelY = $y + 0.5

            # Canonical elbow: east + south. The bend follows the outside of
            # the central item footprint, so a full stack cannot hide its
            # turning point. Its endpoints retain the same in-tile spacing as
            # the straight chevrons on the two neighbouring conveyor tiles.
            $distance = [Math]::Abs(
                [Math]::Sqrt(
                    ($pixelX - 10) * ($pixelX - 10) +
                    ($pixelY - 10) * ($pixelY - 10)
                ) - 18
            )

            if ($pixelX -lt 10 -or $pixelY -lt 10) {
                $distance = 100
            }

            if ($distance -le 3.5) {
                $corner.SetPixel($x, $y, $palette.CornerShadow)
            }
            if ($distance -le 2.75) {
                $corner.SetPixel($x, $y, $palette.CornerOuter)
            }
            if ($distance -le 2.0) {
                $corner.SetPixel($x, $y, $palette.CornerInner)
            }
            if ($distance -le 0.65) {
                $corner.SetPixel($x, $y, $palette.CornerLight)
            }
        }
    }

    $resolvedCornerDirectory = [System.IO.Path]::GetFullPath(
        (Split-Path -Parent $CornerPath)
    )
    [System.IO.Directory]::CreateDirectory($resolvedCornerDirectory) | Out-Null
    $corner.Save(
        [System.IO.Path]::GetFullPath($CornerPath),
        [System.Drawing.Imaging.ImageFormat]::Png
    )
} finally {
    $corner.Dispose()
}

Write-Output ([System.IO.Path]::GetFullPath($BorderPath))
Write-Output ([System.IO.Path]::GetFullPath($CornerPath))
