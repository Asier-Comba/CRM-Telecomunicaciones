# Work60 · source-bound runtime artifact

Build/packaging increment; no new CI workflow or hosted activation.
CLAIM60 and W0 decision request:issue67 comment6423132985. Product base3e98b55; W2 files untouched.

The build already emits Next standalone output. It intentionally omits static/public assets;
the existing Dockerfile supplies those plus the platform entrypoint/configuration.
This tool reuses exactly that COPY contract to retain independently verifiable runtime bytes outside the checkout.
It does not change the Dockerfile, platform validators, dependencies, entrypoint, Netlify configuration or existing CI.
Unknown COPY changes require review instead of silently broadening the payload.

## Execution

From a clean committed source, with no active dotenv files, use an authorized Python3 runtime:

```powershell
$env:ASIER60_PYTHON = '<Python executable>'
node --test tools/asier_release60/package.test.mjs
& $env:ASIER60_PYTHON -B tools/asier_release60/test_archive.py
node tools/asier_release60/build-and-pack.mjs <full-current-commit-sha> <new-external-output-directory>
```

The parent of the new output directory must exist. Existing outputs are never replaced.
The runner invokes the existing platform boundary build with only a small OS environment allowlist,
no inherited provider/public backend settings, and the existing synthetic private canaries.
It preserves cache cleanup and requires clean source before and after building.
Build output is checked before assembly: the raw standalone server serves health but not the missing static/public bytes.
The assembled package uses the unchanged platform entrypoint in an explicit LOCAL unconfigured physical test.
No STAGING/PROD gate is removed and no LOCAL value is used to activate a hosted application.

Outputs:build.json, before-assembly.json, runtime.zip, repeat ZIP, restored runtime, artifact.json.
The ZIP includes a source/tree/input/build-ID/file-digest manifest. It includes no Git history, dotenv files or keys.
Verification requires both an expected full sourceSHA and an independently retained archiveSHA256.
Changed file bytes, extra/duplicate paths, traversal, symlinks, private/cache files and restore overwrite fail closed.
Link-bearing standalone output requires explicit review; no absolute Windows junction is silently relocated.

```powershell
& $env:ASIER60_PYTHON -B tools/asier_release60/archive.py verify <runtime.zip> <source-sha> <archive-sha256>
& $env:ASIER60_PYTHON -B tools/asier_release60/archive.py restore <runtime.zip> <source-sha> <archive-sha256> <new-directory>
```

Two archives from the SAME build have deterministic bytes. Rebuilding Next may produce a different buildID;
bit-for-bit reproducibility across new builds is not claimed. Retain and verify the accepted artifact instead.
This archive is platform-specific; the executed Windows artifact is not a Linux/Netlify artifact or a registry manifest.
Its public backend configuration is deliberately absent. No real login, database, persisted CRM operation or hosted health is tested.
Artifact integrity is not authenticity/signing, W4 approval, release approval or authorization to deploy.
Real browser remains103/116 on3e98 until an approved frontend fix is integrated and accepted on its own newSHA.

Checks reuse the existing health/header/readiness contracts, adding relocated static/public byte equality.
Runtime smoke injects only synthetic private canaries; product/providers stay disabled and absent backend remains503.
It stops only the child tree it owns. No preview3109, Supabase staging, protected Arizan source/ZIP or hosted service is used.

The repository's netlify.toml references a deployment workflow absent from this source.
That reference is not an executable deployment path or permission. Effective Netlify adapter/artifact,
quota, origin permission, security reviews and owner approval remain separate prerequisites.
