from pathlib import Path
import shutil
import stat
import tempfile
import unittest
import zipfile
import archive


class ArchiveBoundary(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix='crm-release60-test-')).resolve()
        self.runtime = self.root / 'runtime'
        self.runtime.mkdir()
        (self.runtime / 'server.js').write_text('synthetic runtime')
        self.meta = dict(source_sha='a' * 40, source_tree='b' * 40, scope='LOCAL_UNCONFIGURED_STANDALONE_NOT_NETLIFY_OR_RELEASE', platform='win32', architecture='x64', node='24.20.0', next='16.4.3', lock_sha256='c' * 64, dockerfile_sha256='d' * 64, build_id_sha256='e' * 64, public_build='UNCONFIGURED', boundary={'status': 'PASS'}, assembled={'files': 1})
        self.artifact = self.root / 'runtime.zip'
        self.sealed = archive.pack(self.runtime, self.artifact, self.meta)

    def tearDown(self):
        assert self.root.parent == Path(tempfile.gettempdir()).resolve() and self.root.name.startswith('crm-release60-test-')
        shutil.rmtree(self.root)

    def rewrite(self, change):
        target = self.root / 'modified.zip'
        with zipfile.ZipFile(self.artifact) as source, zipfile.ZipFile(target, 'w') as destination:
            for info in source.infolist():
                destination.writestr(info, change(info.filename, source.read(info.filename)))
        return target

    def test_same_build_archive_is_deterministic(self):
        other = self.root / 'repeat.zip'
        self.assertEqual(archive.pack(self.runtime, other, self.meta)['archive_sha256'], self.sealed['archive_sha256'])

    def test_restore_exact_source_and_bytes(self):
        out = self.root / 'restored'
        archive.restore(self.artifact, 'a' * 40, self.sealed['archive_sha256'], out)
        self.assertEqual((out / 'server.js').read_text(), 'synthetic runtime')

    def test_wrong_source_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'SOURCE_BINDING_MISMATCH'):
            archive.verify(self.artifact, 'f' * 40, self.sealed['archive_sha256'])

    def test_wrong_archive_digest_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'ARTIFACT_DIGEST_MISMATCH'):
            archive.verify(self.artifact, 'a' * 40, '0' * 64)

    def test_modified_file_is_rejected_even_when_container_digest_is_refreshed(self):
        modified = self.rewrite(lambda name, body: b'changed runtime' if name == 'server.js' else body)
        with self.assertRaisesRegex(ValueError, 'RUNTIME_FILE_DIGEST_MISMATCH'):
            archive.verify(modified, 'a' * 40, archive.sha(modified))

    def test_extra_file_not_in_manifest_is_rejected(self):
        with zipfile.ZipFile(self.artifact, 'a') as target:
            target.writestr('unexpected.js', 'synthetic')
        with self.assertRaisesRegex(ValueError, 'ARCHIVE_INVENTORY_MISMATCH'):
            archive.verify(self.artifact, 'a' * 40, archive.sha(self.artifact))

    def test_no_overwrite_on_restore(self):
        out = self.root / 'keep'; out.mkdir(); (out / 'preserve.txt').write_text('keep')
        with self.assertRaises(FileExistsError):
            archive.restore(self.artifact, 'a' * 40, self.sealed['archive_sha256'], out)
        self.assertEqual((out / 'preserve.txt').read_text(), 'keep')

    def test_zip_slip_secret_cache_and_windows_device_paths_are_rejected(self):
        for name in ('../escape', '/absolute', 'C:/escape', 'a\\escape', '.env.local', '.next/cache/value', 'CON.txt'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                archive.safe_name(name)

    def test_case_colliding_entries_are_rejected(self):
        with zipfile.ZipFile(self.artifact, 'a') as target:
            target.writestr('SERVER.JS', 'synthetic')
        with self.assertRaisesRegex(ValueError, 'ARCHIVE_DUPLICATE_OR_EXCESS_PATHS'):
            archive.verify(self.artifact, 'a' * 40, archive.sha(self.artifact))

    def test_symlink_entries_are_rejected(self):
        with zipfile.ZipFile(self.artifact, 'a') as target:
            info = zipfile.ZipInfo('unsafe-link'); info.create_system = 3; info.external_attr = (stat.S_IFLNK | 0o777) << 16
            target.writestr(info, 'server.js')
        with self.assertRaisesRegex(ValueError, 'ARCHIVE_LINK_OR_ENCRYPTED_ENTRY'):
            archive.verify(self.artifact, 'a' * 40, archive.sha(self.artifact))


if __name__ == '__main__':
    unittest.main()
