$source = "runs/detect/uz_signs_v1/weights/best.pt"
$target = "models/uz_signs_best.pt"

if (-not (Test-Path $source)) {
    Write-Error "Source model topilmadi: $source"
    exit 1
}

Copy-Item -Path $source -Destination $target -Force
Write-Host "Model copy qilindi: $target"
