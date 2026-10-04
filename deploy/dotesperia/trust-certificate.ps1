param(
  [Parameter(Mandatory=$true)][string]$CertificatePath,
  [Parameter(Mandatory=$true)][string]$ExpectedSha256
)
$ErrorActionPreference = 'Stop'
$dotCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new((Resolve-Path -LiteralPath $CertificatePath).Path)
$dotFingerprint = $dotCertificate.GetCertHashString([System.Security.Cryptography.HashAlgorithmName]::SHA256)
if ($dotFingerprint -ne ($ExpectedSha256 -replace ':','').ToUpperInvariant()) { throw 'Certificate fingerprint does not match the authenticated VM.' }
if ($dotCertificate.Subject -ne 'CN=Dotesperia private authority') { throw 'Unexpected certificate subject.' }
if ($dotCertificate.HasPrivateKey) { throw 'Only the public certificate may be imported.' }
$dotConstraints = $dotCertificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.30' }
if (-not $dotConstraints -or -not $dotConstraints.Critical) { throw 'The private authority must constrain its permitted names.' }
Import-Certificate -FilePath (Resolve-Path -LiteralPath $CertificatePath).Path -CertStoreLocation Cert:\CurrentUser\Root | Select-Object Subject,Thumbprint,NotAfter
