"""Synthetic safety tests for the auditor; these are not CRM or cloud tests."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("audit", Path(__file__).with_name("verify.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AcceptanceSafetyTests(unittest.TestCase):
    def rows(self):
        return {"rows": [{"id": str(i), "capability": "Customer: synthetic " + str(i),
                          "IMPLEMENTED": "PASS", "BROWSER_ACCEPTED": "PASS",
                          "RELEASE_READY": True, "source_sha": "a" * 40,
                          "evidence": ["CONTROLLED_HTTP historical"]} for i in range(342)]}

    def test_historical_green_never_promotes_hosted_acceptance(self):
        result = audit.acceptance_rows(self.rows(), "b" * 40)
        self.assertEqual(len(result), 342)
        self.assertTrue(all(r["result"] == "NOT_VERIFIED" and not r["release_ready"] for r in result))
        self.assertTrue(all(r["historical_source_sha"] != r["source_sha"] for r in result))

    def test_duplicate_id_fails_instead_of_silent_drop(self):
        rows = self.rows()
        rows["rows"][-1]["id"] = rows["rows"][0]["id"]
        with self.assertRaises(ValueError):
            audit.acceptance_rows(rows, "b" * 40)

    def test_missing_requirement_fails_instead_of_reducing_denominator(self):
        rows = self.rows()
        rows["rows"].pop()
        with self.assertRaises(ValueError):
            audit.acceptance_rows(rows, "b" * 40)

    def test_equal_count_different_87th_migration_is_not_same_schema(self):
        shared = [{"version": str(i), "sha256": str(i)} for i in range(86)]
        a = {"source_sha": "a" * 40, "migrations": shared + [{"version": "storage", "sha256": "x"}]}
        b = {"source_sha": "b" * 40, "migrations": shared + [{"version": "http", "sha256": "y"}]}
        result = audit.compare(a, b)
        self.assertTrue(result["same_count"])
        self.assertFalse(result["same_migrations"])

    def test_modified_historical_sql_is_detected(self):
        a = {"source_sha": "a" * 40, "migrations": [{"version": "1", "sha256": "x"}]}
        b = {"source_sha": "b" * 40, "migrations": [{"version": "1", "sha256": "y"}]}
        self.assertEqual(audit.compare(a, b)["changed_shared_versions"], ["1"])

    def test_ref_option_injection_is_refused_before_any_git_call(self):
        with patch.object(audit, "git") as git:
            with self.assertRaises(ValueError):
                audit.resolve(Path("."), "--help")
            git.assert_not_called()

    def test_unavailable_source_fails_instead_of_using_head(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(subprocess.CalledProcessError):
                audit.resolve(Path(directory), "missing-ref")


if __name__ == "__main__":
    unittest.main()
