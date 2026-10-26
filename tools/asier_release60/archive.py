"""Deterministic runtime bytes; integrity/provenance verification, never approval."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import sys
import zipfile

MANIFEST = 'release60-manifest.json'


def fail(code):
    raise ValueError(code)


def safe_name(name):
    if not name or '\\' in name or ':' in name or name.startswith('/') or any(ord(c) < 32 for c in name):
        fail('ARCHIVE_PATH_REJECTED')
    parts = name.split('/')
    if any(p in ('', '.', '..') or p.endswith((' ', '.')) for p in parts):
        fail('ARCHIVE_PATH_REJECTED')
    if any(re.fullmatch(r'(?i)(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?', p) for p in parts):
        fail('ARCHIVE_PATH_REJECTED')
    if any(p.lower() == '.git' or p.lower().startswith('.env') for p in parts) or name.startswith('.next/cache/') or '/node_modules/.cache/' in '/' + name:
        fail('SECRET_OR_CACHE_FILE_REJECTED')
    if re.search(r'(?i)\.(pem|key|p12|pfx)$', name):
        fail('SECRET_OR_CACHE_FILE_REJECTED')
    return name


def sha(path):
    value = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def metadata_valid(meta):
    expected = {'source_sha', 'source_tree', 'scope', 'platform', 'architecture', 'node', 'next', 'lock_sha256', 'dockerfile_sha256', 'build_id_sha256', 'public_build', 'boundary', 'assembled'}
    if set(meta) != expected or meta.get('public_build') != 'UNCONFIGURED' or meta.get('platform') not in ('win32', 'linux', 'darwin'):
        fail('EXPLICIT_BUILD_PROFILE_REQUIRED')
    if any(not re.fullmatch('[0-9a-f]{64}', meta.get(key, '')) for key in ('lock_sha256', 'dockerfile_sha256', 'build_id_sha256')):
        fail('BUILD_INPUT_DIGEST_REQUIRED')
    if not re.fullmatch('[0-9a-f]{40}', meta.get('source_sha', '')) or not re.fullmatch('[0-9a-f]{40}', meta.get('source_tree', '')):
        fail('SOURCE_BINDING_REQUIRED')
    if meta.get('scope') != 'LOCAL_UNCONFIGURED_STANDALONE_NOT_NETLIFY_OR_RELEASE':
        fail('EXPLICIT_LOCAL_SCOPE_REQUIRED')


def pack(runtime, output, metadata):
    metadata_valid(metadata)
    root = Path(runtime).resolve()
    files = {}
    for folder, dirs, names in os.walk(root, followlinks=False):
        if any(Path(folder, name).is_symlink() for name in dirs):
            fail('ARCHIVE_LINK_REJECTED')
        for name in names:
            path = Path(folder, name)
            rel = safe_name(path.relative_to(root).as_posix())
            if rel == MANIFEST or path.is_symlink() or not path.is_file():
                fail('REGULAR_RUNTIME_FILES_REQUIRED')
            files[rel] = {'bytes': path.stat().st_size, 'sha256': sha(path)}
    if not files:
        fail('RUNTIME_EMPTY')
    if len({name.casefold() for name in files}) != len(files):
        fail('ARCHIVE_DUPLICATE_PATH')
    manifest = {'format': 'crm-runtime-archive-v1', 'build': metadata, 'files': files}
    encoded = json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode()
    with open(output, 'xb') as target, zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name in sorted([*files, MANIFEST]):
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            mode = stat.S_IMODE((root / name).stat().st_mode) if name != MANIFEST else 0o644
            info.external_attr = (stat.S_IFREG | mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            with archive.open(info, 'w', force_zip64=True) as stream:
                if name == MANIFEST:
                    stream.write(encoded)
                else:
                    with open(root / name, 'rb') as source:
                        shutil.copyfileobj(source, stream)
    return verify(output, metadata['source_sha'], sha(output))


def verify(artifact, expected_source, expected_digest):
    if not re.fullmatch('[0-9a-f]{40}', expected_source) or not re.fullmatch('[0-9a-f]{64}', expected_digest):
        fail('EXPECTED_IDENTITY_REQUIRED')
    if sha(artifact) != expected_digest:
        fail('ARTIFACT_DIGEST_MISMATCH')
    with zipfile.ZipFile(artifact) as archive:
        infos = archive.infolist()
        names = [safe_name(info.filename) for info in infos]
        if len(names) > 40000 or len({name.casefold() for name in names}) != len(names):
            fail('ARCHIVE_DUPLICATE_OR_EXCESS_PATHS')
        if any(stat.S_IFMT(info.external_attr >> 16) not in (0, stat.S_IFREG) or info.flag_bits & 1 for info in infos):
            fail('ARCHIVE_LINK_OR_ENCRYPTED_ENTRY')
        if sum(info.file_size for info in infos) > 1024 * 1024 * 1024 or any(info.file_size > 256 * 1024 * 1024 for info in infos):
            fail('ARCHIVE_SIZE_LIMIT')
        if MANIFEST not in names or archive.getinfo(MANIFEST).file_size > 16 * 1024 * 1024:
            fail('MANIFEST_REQUIRED')
        manifest = json.loads(archive.read(MANIFEST))
        metadata_valid(manifest['build'])
        if manifest['format'] != 'crm-runtime-archive-v1' or manifest['build']['source_sha'] != expected_source:
            fail('SOURCE_BINDING_MISMATCH')
        if set(names) != set(manifest['files']) | {MANIFEST}:
            fail('ARCHIVE_INVENTORY_MISMATCH')
        for name, expected in manifest['files'].items():
            value = hashlib.sha256()
            with archive.open(name) as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    value.update(block)
            if archive.getinfo(name).file_size != expected['bytes'] or value.hexdigest() != expected['sha256']:
                fail('RUNTIME_FILE_DIGEST_MISMATCH')
        return {'status': 'VERIFIED_LOCAL_ARTIFACT', 'source_sha': expected_source, 'archive_sha256': expected_digest, 'runtime_files': len(manifest['files']), 'scope': manifest['build']['scope']}


def restore(artifact, source, digest, destination):
    result = verify(artifact, source, digest)
    out = Path(destination)
    out.mkdir(parents=False, exist_ok=False)
    with zipfile.ZipFile(artifact) as archive:
        for info in archive.infolist():
            if info.filename == MANIFEST:
                continue
            target = out.joinpath(*PurePosixPath(info.filename).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info) as source_file, target.open('xb') as target_file:
                shutil.copyfileobj(source_file, target_file)
            os.chmod(target, stat.S_IMODE(info.external_attr >> 16))
    return result


if __name__ == '__main__':
    try:
        mode, *args = sys.argv[1:]
        if mode == 'pack':
            result = pack(args[0], args[1], json.loads(Path(args[2]).read_text()))
        elif mode == 'verify':
            result = verify(*args)
        elif mode == 'restore':
            result = restore(*args)
        else:
            fail('MODE_REQUIRED')
        print(json.dumps(result))
    except Exception as error:
        code = str(error) if re.fullmatch('[A-Z][A-Z0-9_]{0,80}', str(error)) else 'ARCHIVE_OPERATION_FAILED'
        print(json.dumps({'status': 'BLOCKED', 'error': code}))
        sys.exit(1)
