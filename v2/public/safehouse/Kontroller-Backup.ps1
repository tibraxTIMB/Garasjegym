param([string]$Archive)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
try {
 if(!$Archive){
  Add-Type -AssemblyName System.Windows.Forms
  $dialog=New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Filter='DATABUNKER ZIP (*.zip)|*.zip'
  if($dialog.ShowDialog() -ne 'OK'){exit 1}
  $Archive=$dialog.FileName
 }
 $zip=[IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Archive).Path)
 try {
  $entries=[Collections.Generic.Dictionary[string,IO.Compression.ZipArchiveEntry]]::new([StringComparer]::Ordinal)
  foreach($entry in $zip.Entries){
   $name=$entry.FullName
   if($name -match '(^/|\\|(^|/)\.\.?(/|$)|:)' -or $entries.ContainsKey($name)){throw 'Ugyldig eller duplisert arkivsti.'}
   $entries.Add($name,$entry)
  }
  function Read-SmallText([string]$name,[long]$limit){
   if(!$entries.ContainsKey($name) -or $entries[$name].Length -gt $limit){throw 'Kontrollfil manglar eller er for stor.'}
   $reader=[IO.StreamReader]::new($entries[$name].Open())
   try{return $reader.ReadToEnd()}finally{$reader.Dispose()}
  }
  $manifest=Read-SmallText '03-KONTROLL/SHA256SUMS.txt' 1048576
  $expected=[Collections.Generic.Dictionary[string,string]]::new([StringComparer]::Ordinal)
  foreach($line in ($manifest -split '\r?\n')){
   if(!$line.Trim()){continue}
   if($line -notmatch '^([a-fA-F0-9]{64})  (.+)$'){throw 'Ugyldig kontrollsumfil.'}
   $hash=$Matches[1].ToLowerInvariant();$name=$Matches[2]
   if($expected.ContainsKey($name) -or !$entries.ContainsKey($name) -or $name -eq '03-KONTROLL/SHA256SUMS.txt'){throw 'Kontrollsumregisteret stemmer ikkje.'}
   $expected.Add($name,$hash)
  }
  $required=@('01-DATABASE/database.pgbackup','01-DATABASE/roles.sql','02-APP/app-source.zip','03-KONTROLL/DATABUNKER-receipt.json','04-GJENOPPRETTING/START-HER.txt')
  foreach($name in $required){if(!$expected.ContainsKey($name)){throw 'Nødvendig arkivfil manglar.'}}
  foreach($name in $entries.Keys){if($name -ne '03-KONTROLL/SHA256SUMS.txt' -and !$expected.ContainsKey($name)){throw 'Arkivet inneheld ukontrollerte filer.'}}
  $receipt=Read-SmallText '03-KONTROLL/DATABUNKER-receipt.json' 16384 | ConvertFrom-Json
  if($receipt.version -ne 1 -or $receipt.project -ne 'izwzwvlexqxqewzijhhd' -or $receipt.archive_checked -ne $true -or $receipt.auth_tables_present -ne $true -or $receipt.public_tables_present -ne $true -or $receipt.code_zip_checked -ne $true -or $receipt.storage_objects -ne 0 -or $receipt.code_commit -notmatch '^[a-fA-F0-9]{40}$' -or $receipt.archive_sha256 -notmatch '^[a-fA-F0-9]{64}$'){throw 'Kvitteringa gjeld ikkje ei kontrollert GarasjeGym-kopi.'}
  $date=[DateTimeOffset]::Parse($receipt.completed_at)
  if($date -gt [DateTimeOffset]::UtcNow.AddMinutes(5)){throw 'Ugyldig backupdato.'}
  $db='01-DATABASE/database.pgbackup'
  if($receipt.archive_bytes -ne $entries[$db].Length -or $entries[$db].Length -lt 1024 -or $receipt.archive_sha256.ToLowerInvariant() -ne $expected[$db]){throw 'Databasekvitteringa stemmer ikkje med arkivet.'}
  $sha=[Security.Cryptography.SHA256]::Create()
  try{
   foreach($name in $expected.Keys){
    $stream=$entries[$name].Open()
    try{$actual=([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}finally{$stream.Dispose()}
    if($actual -ne $expected[$name]){throw 'Kontrollsumfeil i arkivet.'}
   }
  }finally{$sha.Dispose()}
  Write-Host 'OK: Alle arkivfiler samsvarar med kontrollsummane.'
  Write-Host ('Backupdato: '+$date.ToString('o'))
  Write-Host ('Kontrollerte filer: '+$expected.Count)
  Write-Host 'Dette beviser ikkje at arkivet er autentisk eller kan gjenopprettast. Ingen databasekontakt eller restore er utført.'
 }finally{$zip.Dispose()}
 exit 0
}catch{
 Write-Host 'KONTROLL STOPPA: Arkivet kunne ikkje verifiserast. Ingen data er lasta opp.'
 exit 1
}
