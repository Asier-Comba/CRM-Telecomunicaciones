"""Offline, read-only source auditor. Never connects to a database or provider.

Run from a cloud runner or any checkout with Python 3 and Git. JSON on stdout
contains source observations, never application acceptance or runtime env values.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

PROJECT = "zgwotxnyqzfuzcnmgvtn"
QUEUE = "docs/master/PRODUCT_RELEASE_QUEUE.json"
VALID_STATES = {"READY_CLOUD", "PARTIAL", "BLOCKED", "NOT_VERIFIED", "NOT_IMPLEMENTED"}
_BLOBS = {}


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args], stderr=subprocess.PIPE)


def resolve(repo, ref):
    if not re.fullmatch(r"[A-Za-z0-9_./-]+", ref) or ref.startswith("-"):
        raise ValueError("Invalid source reference; no fallback to HEAD")
    sha = git(repo, "rev-parse", "--verify", ref + "^{commit}").decode().strip()
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("Unresolved source")
    return sha


def read(repo, sha, path):
    key = (str(repo), sha, path)
    return _BLOBS[key] if key in _BLOBS else git(repo, "show", sha + ":" + path)


def cache_blobs(repo, sha, paths):
    if any("\n" in path or "\r" in path for path in paths):
        raise ValueError("Unsupported path")
    batch = subprocess.run(["git", "-C", str(repo), "cat-file", "--batch"],
                           input="".join(sha + ":" + path + "\n" for path in paths).encode(),
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout
    pos = 0
    for path in paths:
        end = batch.index(b"\n", pos)
        header = batch[pos:end].split()
        if len(header) != 3 or header[1] != b"blob":
            raise ValueError("Missing source blob")
        size = int(header[2])
        pos = end + 1
        _BLOBS[(str(repo), sha, path)] = batch[pos:pos + size]
        pos += size + 1
    if pos != len(batch):
        raise ValueError("Invalid source batch")


def migration_identity(records):
    """Counts alone are insufficient: bind the ordered version AND byte hashes."""
    canonical = json.dumps(records, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(canonical).hexdigest()


def source_snapshot(repo, ref):
    sha = resolve(repo, ref)
    paths = git(repo, "ls-tree", "-r", "--name-only", sha).decode().splitlines()
    cache_blobs(repo, sha, [p for p in paths if p.startswith(("supabase/migrations/", "src/lib/server/", "src/assistant/", "scripts/", ".github/workflows/", "infra/platform/", "src/features/product/integration/"))])
    migrations = []
    consumers = []
    exact_count_references = []
    for path in paths:
        if path.startswith("supabase/migrations/") and path.endswith(".sql"):
            version = path.rsplit("/", 1)[1].split("_", 1)[0]
            migrations.append({"version": version, "path": path,
                               "sha256": hashlib.sha256(read(repo, sha, path)).hexdigest()})
        if path.startswith(("src/lib/server/", "src/assistant/")) and path.endswith(".ts"):
            body = read(repo, sha, path).decode("utf-8-sig")
            if "40001" in body or "PT409" in body:
                consumers.append({"path": path, "PT409_token_present": "PT409" in body,
                                  "40001_token_present": "40001" in body,
                                  "scope": "STATIC_TOKEN_OBSERVATION_NOT_RUNTIME_COMPATIBILITY"})
        if path.startswith(("scripts/", ".github/workflows/")) and path.endswith((".mjs", ".sh", ".yml", ".json")):
            body = read(repo, sha, path).decode("utf-8-sig")
            lines = [i for i, line in enumerate(body.splitlines(), 1)
                     if re.search(r"require_grants_86|migration.{0,40}(?:===?|!==?)\s*86\b|expected.{0,30}86\b", line, re.I)]
            if lines:
                exact_count_references.append({"path": path, "lines": lines,
                                               "scope": "STATIC_REVIEW_CANDIDATE_NOT_PROVEN_FAILURE"})
    versions = [m["version"] for m in migrations]
    if len(versions) != len(set(versions)):
        raise ValueError("Duplicate migration version")
    mode_path = "src/features/product/integration/mode.ts"
    mode = read(repo, sha, mode_path).decode("utf-8-sig")
    manifest = json.loads(read(repo, sha, "infra/platform/environment-manifest.json"))
    return {"source_sha": sha,
            "source_tree": git(repo, "show", "-s", "--format=%T", sha).decode().strip(),
            "migration_count": len(migrations), "migrations": migrations,
            "migration_identity_sha256": migration_identity(migrations),
            "netlify_toml_tracked": "netlify.toml" in paths,
            "mode_blob_sha256": hashlib.sha256(read(repo, sha, mode_path)).hexdigest(),
            "hosted_staging_symbol_present": "hostedStagingAllowed" in mode,
            "rpc_error_consumers": consumers, "exact_count_reference_candidates": exact_count_references,
            "environment_manifest_sha256": hashlib.sha256(read(repo, sha, "infra/platform/environment-manifest.json")).hexdigest(),
            "environment_manifest_includes_values": manifest.get("values_included"),
            "runtime_status": "NOT_RUN", "hosted_schema": "NOT_VERIFIED"}


def acceptance_rows(queue, source_sha, expected_count=342):
    rows = queue["rows"]
    ids = [row["id"] for row in rows]
    if len(rows) != expected_count or len(set(ids)) != expected_count:
        raise ValueError("Requirement count or uniqueness mismatch")
    result = []
    for row in rows:
        capability = row["capability"]
        module = capability.split(":", 1)[0] if ":" in capability else row.get("family", "ROW_CONTRACT_UNRECONCILED")
        result.append({"id": row["id"], "capability": capability, "module": module,
                       "contract": "ROW_CONTRACT_NOT_RECONCILED",
                       "source_sha": source_sha,
                       "evidence": [{"path": QUEUE, "source_sha": source_sha, "scope": "SOURCE_RECORD_ONLY"}],
                       "source_row_status": {k: row.get(k) for k in ["IMPLEMENTED", "PROVEN_BACKEND", "CONSUMED_UI", "BROWSER_ACCEPTED", "VISUAL_ACCEPTED", "SECURITY_ACCEPTED", "EXTERNAL_BLOCKED", "RELEASE_READY"]},
                       "historical_source_sha": row.get("source_sha"),
                       "historical_evidence": row.get("evidence", []),
                       "test_type": "NOT_RUN_CLOUD", "result": "NOT_VERIFIED",
                       "environment": "SUPABASE_CLOUD_AND_NEXT_CLOUD_E2E_NOT_RUN",
                       "risks": ["No row-specific hosted acceptance for this source and authorized cohort",
                                 "Historical or aggregate passes cannot establish cloud acceptance"],
                       "responsible": row.get("owner", "OWNER_NOT_CERTIFIED"),
                       "next_step": "Reconcile the specific contract and hosted positive/negative evidence for: " + capability,
                       "execution_gate": "BLOCKED_ACCESS_AND_OWNER_QA_WINDOW",
                       "release_ready": False})
    return result


def compare(left, right):
    a = {m["version"]: m["sha256"] for m in left["migrations"]}
    b = {m["version"]: m["sha256"] for m in right["migrations"]}
    return {"left_sha": left["source_sha"], "right_sha": right["source_sha"],
            "same_count": len(a) == len(b), "same_migrations": a == b,
            "right_only_versions": sorted(b.keys() - a.keys()),
            "left_only_versions": sorted(a.keys() - b.keys()),
            "changed_shared_versions": sorted(k for k in a.keys() & b.keys() if a[k] != b[k]),
            "acceptance": "NOT_ESTABLISHED_BY_STATIC_COMPARISON"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--source-ref", required=True)
    parser.add_argument("--compare-ref", required=True)
    args = parser.parse_args()
    source = source_snapshot(args.repo, args.source_ref)
    other = source_snapshot(args.repo, args.compare_ref)
    queue = json.loads(read(args.repo, source["source_sha"], QUEUE))
    rows = acceptance_rows(queue, source["source_sha"])
    print(json.dumps({"schema": "oier.cloud.audit.v1", "project_id": PROJECT,
                      "scope": "OFFLINE_SOURCE_AUDITOR_NOT_HOSTED_ACCEPTANCE",
                      "source": source, "comparison_source": other,
                      "comparison": compare(source, other), "requirements": rows,
                      "cloud_ready": False, "release": "NOT_ACCEPTED",
                      "measurements_not_observed": None}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(json.dumps({"error": type(exc).__name__, "result": "AUDIT_FAILED_CLOSED",
                          "cloud_ready": False, "release": "NOT_ACCEPTED"}), file=sys.stderr)
        sys.exit(1)
