param([int]$Port = 8011)
$ErrorActionPreference = 'Stop'
$repoDirectory = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoDirectory
$env:PYTHONPATH = Join-Path $repoDirectory 'src'
$env:PYTHONIOENCODING = 'utf-8'
$env:EMBEDDING_BACKEND = 'bge'
$env:EMBEDDING_MODEL = 'E:\bge-large-zh'
$env:EMBEDDING_DIMENSION = '1024'
$env:VECTOR_BACKEND = 'local'
$env:VECTOR_STORE_PATH = 'E:\codex_workplace\sanguo-rag\teacher-bge-v1\index.json'
& 'C:\Program Files\Python312\python.exe' -B -m uvicorn api:app --host 127.0.0.1 --port $Port --app-dir (Join-Path $repoDirectory 'src')
