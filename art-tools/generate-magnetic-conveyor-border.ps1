param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$outputDirectory = Split-Path -Parent $OutputPath

$palette = @{
    InnerDark = [System.Drawing.ColorTranslator]::FromHtml('#2b174f')
    InnerGlow = [System.Drawing.ColorTranslator]::FromHtml('#9558ff')
    Purple    = [System.Drawing.ColorTranslator]::FromHtml('#6230bd')
    CopperDark = [System.Drawing.ColorTranslator]::FromHtml('#85483d')
    Copper     = [System.Drawing.ColorTranslator]::FromHtml('#c77762')
    CopperGlow = [System.Drawing.ColorTranslator]::FromHtml('#e59a78')
}

$bitmap = [System.Drawing.Bitmap]::new(
    6,
    32,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)

try {
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
        $phase = $y % 8

        $bitmap.SetPixel(0, $y, $palette.InnerDark)
        $bitmap.SetPixel(
            1,
            $y,
            $(if ($phase -in 2, 3) { $palette.InnerGlow } else { $palette.Purple })
        )
        $bitmap.SetPixel(2, $y, $palette.Purple)
        $bitmap.SetPixel(3, $y, $palette.CopperDark)
        $bitmap.SetPixel(
            4,
            $y,
            $(if ($phase -in 5, 6) { $palette.CopperGlow } else { $palette.Copper })
        )
        $bitmap.SetPixel(5, $y, $palette.Copper)
    }

    $resolvedDirectory = [System.IO.Path]::GetFullPath($outputDirectory)
    [System.IO.Directory]::CreateDirectory($resolvedDirectory) | Out-Null
    $bitmap.Save(
        [System.IO.Path]::GetFullPath($OutputPath),
        [System.Drawing.Imaging.ImageFormat]::Png
    )
} finally {
    $bitmap.Dispose()
}

Write-Output ([System.IO.Path]::GetFullPath($OutputPath))
