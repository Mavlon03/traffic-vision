New-Item -ItemType Directory -Force -Path "dataset\raw" | Out-Null
New-Item -ItemType Directory -Force -Path "dataset\exports" | Out-Null
New-Item -ItemType Directory -Force -Path "dataset\images\train" | Out-Null
New-Item -ItemType Directory -Force -Path "dataset\images\val" | Out-Null
New-Item -ItemType Directory -Force -Path "dataset\images\test" | Out-Null
New-Item -ItemType Directory -Force -Path "dataset\labels\train" | Out-Null
New-Item -ItemType Directory -Force -Path "dataset\labels\val" | Out-Null
New-Item -ItemType Directory -Force -Path "dataset\labels\test" | Out-Null

Write-Host "Dataset papkalari tayyor."
Write-Host "1. Rasmlarni dataset\\raw yoki dataset\\exports ichiga joylang."
Write-Host "2. Label qiling."
Write-Host "3. python scripts\\split_dataset.py"
Write-Host "4. python scripts\\validate_dataset.py"
Write-Host "5. python train_yolo.py"
