# GarasjeGym DATABUNKER 1.0 - read-only capture. No admin rights or execution-policy changes.
# Run only on an approved computer, with an approved encrypted destination.
$ErrorActionPreference = 'Stop'
$project = 'izwzwvlexqxqewzijhhd'
$repo = 'tibraxTIMB/Garasjegym'
$branch = 'garasjegym-2.0-sturm' + [char]0x00AD + 'kopf'
$stage = $null
$partial = $null
$configFile = Join-Path $PSScriptRoot 'DATABUNKER-innstillingar.json'
function Select-Folder([string]$message){
 Add-Type -AssemblyName System.Windows.Forms
 $dialog=New-Object System.Windows.Forms.FolderBrowserDialog
 $dialog.Description=$message; $dialog.ShowNewFolderButton=$false
 try { if($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK){throw 'Avbrote.'}; return $dialog.SelectedPath } finally { $dialog.Dispose() }
}
$oldEnv = @{}
$names = @('PGHOST','PGPORT','PGUSER','PGDATABASE','PGSSLMODE','PGSSLROOTCERT','PGPASSWORD','PGCONNECT_TIMEOUT','PGSERVICE','PGSERVICEFILE','PGOPTIONS')
foreach ($name in $names) { $oldEnv[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
function Invoke-Checked([string]$exe, [string[]]$arguments) {
    & $exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "A required tool failed (exit $LASTEXITCODE). No success receipt was created." }
}
try {
    Write-Host 'DATABUNKER - GarasjeGym' -ForegroundColor Yellow
    $config=$null
    if(Test-Path -LiteralPath $configFile){
      try{$config=Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json}catch{}
    }
    if($config -and (Read-Host 'Trykk Enter for backup, eller skriv O for nytt oppsett') -eq 'O'){$config=$null}
    if(!$config){
      Write-Host 'FORSTE GONG: vel to mapper og kopier adressa fra Supabase Connect.'
      if ((Read-Host 'Har du lov til a bruke denne PC-en og ei kryptert privat lagring? Skriv JA') -cne 'JA') { throw 'Avbrote. Bruk godkjend privat PC og kryptert lagring.' }
      $bin=Select-Folder 'Vel bin-mappa i den utpakka PostgreSQL 17 ZIP-fila'
      $destination=Select-Folder 'Vel godkjend KRYPTERT privat lagringsmappe'
      $pooler=(Read-Host 'Lim inn Host fra Supabase Connect > Session pooler').Trim()
      $cert=(Read-Host 'Trykk Enter for vanleg sertifikatkontroll. Alternativt godkjend CA-fil').Trim('"')
    }else{
      $bin=[string]$config.bin; $destination=[string]$config.destination; $pooler=[string]$config.pooler; $cert=[string]$config.cert
    }
    $dump=Join-Path $bin 'pg_dump.exe';$restore=Join-Path $bin 'pg_restore.exe'
    $psql=Join-Path $bin 'psql.exe';$dumpall=Join-Path $bin 'pg_dumpall.exe'
    foreach($exe in @($dump,$restore,$psql,$dumpall)){if(!(Test-Path -LiteralPath $exe -PathType Leaf)){throw 'PostgreSQL-verktøya er ikkje tilgjengelege. Start paa nytt og vel O for oppsett.'}}
    $v=(& $dump --version | Out-String).Trim()
    if($LASTEXITCODE -ne 0 -or $v -notmatch '\b17\.'){throw 'Bruk PostgreSQL 17 ZIP-verktøya.'}
    if(!(Test-Path -LiteralPath $destination -PathType Container)){throw 'Lagringsmappa manglar. Kople til disken og prov igjen.'}
    $destination=(Resolve-Path -LiteralPath $destination).Path
    if($destination -match '(?i)OneDrive|SharePoint|Dropbox|Google Drive|Garasjegym[\\/]v2'){throw 'Vel separat godkjend kryptert privat lagring.'}
    if($pooler -notmatch '^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$'){throw 'Ugyldig Host. Kopier fra Supabase Connect.'}
    if($cert -and !(Test-Path -LiteralPath $cert -PathType Leaf)){throw 'CA-fil manglar.'}
    Write-Host "Backup blir lagra i: $destination"
    Write-Host 'Sjekk at lagringa er godkjend og framleis kryptert. ZIP-fila er ikkje passordkryptert.'
    $env:PGHOST=$pooler; $env:PGPORT='5432'; $env:PGUSER="postgres.$project"; $env:PGDATABASE='postgres'
    $env:PGSSLMODE='verify-full'; $env:PGSSLROOTCERT=if($cert){$cert}else{'system'}
    $env:PGCONNECT_TIMEOUT='15'
    foreach ($name in @('PGSERVICE','PGSERVICEFILE','PGOPTIONS')) { [Environment]::SetEnvironmentVariable($name,$null,'Process') }
    $secret = Read-Host 'Skriv databasepassordet ditt (ikkje passordet til GarasjeGym)' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try { $env:PGPASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr); $secret.Dispose() }
    # Probe only counts/schema, never export individual records to terminal.
    $query = "select (select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'),(select count(*) from storage.objects),(select count(*) from auth.users),current_setting('server_version_num');"
    $probe = (& $psql -X -A -t -F '|' -v ON_ERROR_STOP=1 -c $query | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $probe -notmatch '^\d+\|\d+\|\d+\|17\d+$') { throw 'Database connection or inventory verification failed. No TLS downgrade is allowed.' }
    $counts = $probe.Split('|')
    if ([int]$counts[0] -lt 1 -or [int]$counts[1] -ne 0) { throw 'Unexpected database or Storage objects found. Separate object backup is required before a success receipt.' }
    $tables = @(& $psql -X -A -t -v ON_ERROR_STOP=1 -c "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name")
    if ($LASTEXITCODE -ne 0 -or $tables.Count -ne [int]$counts[0]) { throw 'Public table inventory failed.' }
    # Persist only non-secret setup after successful connection. Password is never saved.
    @{bin=$bin;destination=$destination;pooler=$pooler;cert=$cert}|ConvertTo-Json|Set-Content -Encoding UTF8 -LiteralPath $configFile
    $stamp = (Get-Date).ToString('yyyy-MM-dd_HH-mm-ss')
    $stage = Join-Path $destination ("DATABUNKER-$stamp-incomplete-" + [Guid]::NewGuid().ToString('N').Substring(0,8))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $dbDir=Join-Path $stage '01-DATABASE';$appDir=Join-Path $stage '02-APP';$controlDir=Join-Path $stage '03-KONTROLL';$guideDir=Join-Path $stage '04-GJENOPPRETTING'
    foreach($dir in @($dbDir,$appDir,$controlDir,$guideDir)){New-Item -ItemType Directory -Path $dir|Out-Null}
    $archive = Join-Path $dbDir 'database.pgbackup'
    Write-Host 'Capturing consistent PostgreSQL logical archive...'
    Invoke-Checked $dump @('--format=custom','--no-password','--file',$archive,'--exclude-table-data=storage.buckets_vectors','--exclude-table-data=storage.vector_indexes')
    # Separate role definitions; no role passwords. Platform roles need selective restore.
    Invoke-Checked $dumpall @('--roles-only','--no-role-passwords','--no-password','--file',(Join-Path $dbDir 'roles.sql'))
    $toc = @(& $restore --list $archive)
    if ($LASTEXITCODE -ne 0) { throw 'Archive directory is unreadable.' }
    $toc | Set-Content -Encoding UTF8 (Join-Path $controlDir 'archive-inventory.txt')
    foreach ($table in $tables) {
        $pattern = '\bTABLE DATA public ' + [regex]::Escape($table) + '\s'
        if (!($toc -match $pattern)) { throw "Missing public table data in archive: $table" }
    }
    foreach ($table in @('users','identities')) {
        if (!($toc -match ("\bTABLE DATA auth " + $table + '\s'))) { throw "Missing auth.$table in archive." }
    }
    # Decode the entire archive without connecting to a database or writing a second SQL copy.
    Invoke-Checked $restore @('--file=NUL',$archive)
    # Remove database password before contacting GitHub.
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Write-Host 'Saving exact source revision from GitHub...'
    $encoded = [Uri]::EscapeDataString($branch)
    $head = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/commits/$encoded" -Headers @{'User-Agent'='GarasjeGym-Safehouse'}
    $commit = [string]$head.sha
    if ($commit -notmatch '^[a-f0-9]{40}$') { throw 'Invalid GitHub revision.' }
    $zip = Join-Path $appDir 'app-source.zip'
    Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/$repo/zip/$commit" -OutFile $zip
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zipCheck = [IO.Compression.ZipFile]::OpenRead($zip)
    try {
        if (!($zipCheck.Entries.FullName -match '/v2/src/App\.jsx$') -or !($zipCheck.Entries.FullName -match '/v2/package-lock\.json$')) { throw 'Source archive is incomplete.' }
        # Read each entry to EOF, without extraction.
        foreach ($entry in $zipCheck.Entries) { $stream=$entry.Open(); try { $stream.CopyTo([IO.Stream]::Null) } finally { $stream.Dispose() } }
    } finally { $zipCheck.Dispose() }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
    $receipt = [ordered]@{version=1;project=$project;completed_at=[DateTime]::UtcNow.ToString('o');archive_checked=$true;auth_tables_present=$true;public_tables_present=$true;storage_objects=0;code_zip_checked=$true;archive_sha256=$hash;archive_bytes=(Get-Item -LiteralPath $archive).Length;code_commit=$commit}
    @('Logical archive includes public and auth data, not a tested recovery.','Do not restore over production. Use a compatible isolated Supabase instance.','Project configuration, Edge Function secrets and Storage object bytes require separate handling.','Source ZIP is branch head at capture, not a Git history mirror or proof of deployed revision.','Source project: '+$project,'PostgreSQL tools: '+$v,'Public table count at probe: '+$counts[0],'Auth user count at probe: '+$counts[2]) | Set-Content -Encoding UTF8 (Join-Path $guideDir 'capture-notes.txt')
    $receipt | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $controlDir 'DATABUNKER-receipt.json')
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'LES-MEG.txt') -Destination (Join-Path $guideDir 'START-HER.txt')
    @('GARASJEGYM DATABUNKER','This ZIP is NOT password encrypted. Store only on approved encrypted media.','01-DATABASE: data, schema and role definitions.','02-APP: source code ZIP.','03-KONTROLL: receipt and file checksums.','04-GJENOPPRETTING: read START-HER.txt.','Never restore directly into production. No restore has been tested.') | Set-Content -Encoding UTF8 (Join-Path $stage 'START-HER.txt')
    $files=@(Get-ChildItem -LiteralPath $stage -Recurse -File)
    $expected=@{}
    foreach($file in $files){
        $relative=$file.FullName.Substring($stage.Length+1).Replace('\','/')
        $expected[$relative]=(Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
    }
    $expected.GetEnumerator()|Sort-Object Name|ForEach-Object{"$($_.Value)  $($_.Name)"}|Set-Content -Encoding UTF8 (Join-Path $controlDir 'SHA256SUMS.txt')
    $final=Join-Path $destination "GarasjeGym-Backup-$stamp.zip"
    if(Test-Path -LiteralPath $final){throw 'Ei kopi med dette filnamnet finst allereie. Prov igjen.'}
    $partial=$final+'.incomplete'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $writer=[IO.Compression.ZipFile]::Open($partial,[IO.Compression.ZipArchiveMode]::Create)
    try{
      foreach($file in (Get-ChildItem -LiteralPath $stage -Recurse -File)){
        $relative=$file.FullName.Substring($stage.Length+1).Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($writer,$file.FullName,$relative,[IO.Compression.CompressionLevel]::NoCompression)|Out-Null
      }
    }finally{$writer.Dispose()}
    $check=[IO.Compression.ZipFile]::OpenRead($partial)
    $sha=[Security.Cryptography.SHA256]::Create()
    try{
        foreach($name in $expected.Keys){
            $entry=$check.GetEntry($name)
            if(!$entry){throw "ZIP manglar $name"}
            $stream=$entry.Open()
            try{$actual=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant()}finally{$stream.Dispose()}
            if($actual -ne $expected[$name]){throw "Kontrollsumfeil i ZIP: $name"}
        }
        if(!$check.GetEntry('03-KONTROLL/SHA256SUMS.txt')){throw 'Kontrollfila manglar.'}
    }finally{$sha.Dispose();$check.Dispose()}
    Move-Item -LiteralPath $partial -Destination $final
    $partial=$null
    Remove-Item -LiteralPath $stage -Recurse -Force
    $stage=$null
    Write-Host "FERDIG: $final" -ForegroundColor Green
    Write-Host 'Vel denne ZIP-fila i Drift > DATABUNKER. Berre kontrollkvitteringa blir lesen lokalt i nettlesaren.'
    Write-Host 'Kopier ZIP-fila til ei separat kryptert privat lagring. Restore er ikkje testa.'
    explorer.exe $destination
} catch {
    Write-Host ('DATABUNKER stopped: '+$_.Exception.Message) -ForegroundColor Red
    if($partial -and (Test-Path -LiteralPath $partial)){Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue}
    if($stage){Write-Host "Incomplete files remain on the encrypted destination: $stage. No valid backup is implied. Remove incomplete files locally when safe."}
    throw
} finally {
    foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$oldEnv[$name],'Process')}
}
