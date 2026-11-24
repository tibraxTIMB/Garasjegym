# GarasjeGym SAFEHOUSE 1.0 - read-only capture. No admin rights or execution-policy changes.
# Run only on an approved computer, with an approved encrypted destination.
$ErrorActionPreference = 'Stop'
$project = 'izwzwvlexqxqewzijhhd'
$repo = 'tibraxTIMB/Garasjegym'
$branch = 'garasjegym-2.0-sturm' + [char]0x00AD + 'kopf'
$stage = $null
$oldEnv = @{}
$names = @('PGHOST','PGPORT','PGUSER','PGDATABASE','PGSSLMODE','PGSSLROOTCERT','PGPASSWORD','PGCONNECT_TIMEOUT','PGSERVICE','PGSERVICEFILE','PGOPTIONS')
foreach ($name in $names) { $oldEnv[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
function Invoke-Checked([string]$exe, [string[]]$arguments) {
    & $exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "A required tool failed (exit $LASTEXITCODE). No success receipt was created." }
}
try {
    Write-Host 'SAFEHOUSE - GarasjeGym' -ForegroundColor Yellow
    Write-Host 'Requires PostgreSQL 17 Windows ZIP tools and approved encrypted storage. No installation or administrator access is required if the tools run on this PC.'
    if ((Read-Host 'Is this private backup permitted by your employer AND is the destination encrypted? Type YES') -cne 'YES') { throw 'Cancelled: do not store private member data on an unapproved work computer.' }
    $bin = (Read-Host 'Path to extracted PostgreSQL 17 bin folder (contains pg_dump.exe)').Trim('"')
    $dump = Join-Path $bin 'pg_dump.exe'
    $restore = Join-Path $bin 'pg_restore.exe'
    $psql = Join-Path $bin 'psql.exe'
    $dumpall = Join-Path $bin 'pg_dumpall.exe'
    foreach ($exe in @($dump,$restore,$psql,$dumpall)) { if (!(Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Missing PostgreSQL tool: $exe" } }
    $v = (& $dump --version | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $v -notmatch '\b17\.') { throw 'Use the PostgreSQL 17 Windows binaries. If work policy blocks the tools, use an approved personal PC instead.' }
    $destination = (Read-Host 'Existing folder on approved encrypted PRIVATE storage (not GitHub or work OneDrive)').Trim('"')
    if (!(Test-Path -LiteralPath $destination -PathType Container)) { throw 'Destination must already exist.' }
    $destination = (Resolve-Path -LiteralPath $destination).Path
    if ($destination -match '(?i)OneDrive|SharePoint|Dropbox|Google Drive|Garasjegym[\\/]v2') { throw 'Use a separate approved encrypted private folder, not synced storage or the application repository.' }
    $pooler = (Read-Host 'Supabase Connect > Session pooler > host only, port 5432').Trim()
    if ($pooler -notmatch '^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$') { throw 'Invalid session pooler hostname. Copy only the host from the active project Connect dialog.' }
    $cert = (Read-Host 'Trusted CA bundle path, or Enter to use system trust').Trim('"')
    if ($cert -and !(Test-Path -LiteralPath $cert -PathType Leaf)) { throw 'Trusted CA file does not exist.' }
    $env:PGHOST=$pooler; $env:PGPORT='5432'; $env:PGUSER="postgres.$project"; $env:PGDATABASE='postgres'
    $env:PGSSLMODE='verify-full'; $env:PGSSLROOTCERT=if($cert){$cert}else{'system'}
    $env:PGCONNECT_TIMEOUT='15'
    foreach ($name in @('PGSERVICE','PGSERVICEFILE','PGOPTIONS')) { [Environment]::SetEnvironmentVariable($name,$null,'Process') }
    $secret = Read-Host 'Supabase database password (not app login password)' -AsSecureString
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
    $stamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
    $stage = Join-Path $destination ("SAFEHOUSE-$stamp-incomplete-" + [Guid]::NewGuid().ToString('N').Substring(0,8))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $archive = Join-Path $stage 'database.pgbackup'
    Write-Host 'Capturing consistent PostgreSQL logical archive...'
    Invoke-Checked $dump @('--format=custom','--no-password','--file',$archive,'--exclude-table-data=storage.buckets_vectors','--exclude-table-data=storage.vector_indexes')
    # Separate role definitions; no role passwords. Platform roles need selective restore.
    Invoke-Checked $dumpall @('--roles-only','--no-role-passwords','--no-password','--file',(Join-Path $stage 'roles.sql'))
    $toc = @(& $restore --list $archive)
    if ($LASTEXITCODE -ne 0) { throw 'Archive directory is unreadable.' }
    $toc | Set-Content -Encoding UTF8 (Join-Path $stage 'archive-inventory.txt')
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
    $zip = Join-Path $stage 'app-source.zip'
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
    @('Logical archive includes public and auth data, not a tested recovery.','Do not restore over production. Use a compatible isolated Supabase instance.','Project configuration, Edge Function secrets and Storage object bytes require separate handling.','Source ZIP is branch head at capture, not a Git history mirror or proof of deployed revision.','Source project: '+$project,'PostgreSQL tools: '+$v,'Public table count at probe: '+$counts[0],'Auth user count at probe: '+$counts[2]) | Set-Content -Encoding UTF8 (Join-Path $stage 'capture-notes.txt')
    $receipt | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $stage 'SAFEHOUSE-receipt.json')
    Get-ChildItem -LiteralPath $stage -File | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash.ToLowerInvariant())  $(Split-Path $_.Path -Leaf)" } | Set-Content -Encoding UTF8 (Join-Path $stage 'SHA256SUMS.txt')
    $final = Join-Path $destination "SAFEHOUSE-$stamp"
    Move-Item -LiteralPath $stage -Destination $final
    $stage=$null
    Write-Host "Archive checked: $final" -ForegroundColor Green
    Write-Host 'Copy the folder to a separate encrypted drive. Import only SAFEHOUSE-receipt.json into Drift. Restore is NOT tested.'
} catch {
    Write-Host ('SAFEHOUSE stopped: '+$_.Exception.Message) -ForegroundColor Red
    if($stage){Write-Host "Incomplete files remain on the encrypted destination: $stage. No valid backup is implied. Remove incomplete files locally when safe."}
    throw
} finally {
    foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$oldEnv[$name],'Process')}
}
