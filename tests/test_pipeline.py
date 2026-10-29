import base64
from contextlib import redirect_stdout, redirect_stderr
import copy
import io
import json
import os
from pathlib import Path
import shutil
import ssl
import subprocess
import tempfile
import unittest
from unittest.mock import patch, Mock

from PIL import Image

from kitwise.domain import Metadata, Asset, Problem, check_target, csv_metadata
from kitwise.engine import run
from kitwise.metadata import embed
from kitwise.source import LocalInbox, DriveInbox, batch
from kitwise.state import Codec, FileState
from kitwise.transfer import FTPS, SFTP, targets_from_json


def metadata(filename="sample.jpg", ai=False, targets=None):
    return {"filename": filename, "title": "Orange pumpkin on a plain white background",
            "description": "A bright orange pumpkin isolated on a plain white background.",
            "keywords": ["pumpkin", "orange", "autumn", "isolated", "white", "background", "illustration"],
            "ai_generated": ai, "targets": targets or ["adobe"], "categories": {"adobe": 15, "shutterstock": "8"}}


def key():
    return base64.b64encode(os.urandom(32)).decode()


class DomainTests(unittest.TestCase):
    def test_missing_ai_flag_is_not_silently_false(self):
        data = metadata()
        del data["ai_generated"]
        with self.assertRaisesRegex(Problem, "explicit_boolean"):
            Metadata.parse(data)

    def test_false_string_is_not_false_boolean(self):
        data = metadata()
        data["ai_generated"] = "false"
        with self.assertRaises(Problem):
            Metadata.parse(data)

    def test_path_and_control_character_injection_rejected(self):
        for filename in ["../sample.jpg", "a/b.jpg", "a\\b.jpg", "a\n.jpg"]:
            with self.subTest(filename=filename), self.assertRaises(Problem):
                Metadata.parse(metadata(filename))

    def test_keyword_order_preserved_and_duplicates_removed(self):
        data = metadata()
        data["keywords"] += ["PUMPKIN"]
        self.assertEqual(Metadata.parse(data).keywords[0], "pumpkin")
        self.assertEqual(len(Metadata.parse(data).keywords), 7)

    def test_ai_never_routed_to_shutterstock(self):
        a = Asset(Metadata.parse(metadata(ai=True)), Path("sample.jpg"), "a" * 64, 4000, 4000, "JPEG")
        with self.assertRaisesRegex(Problem, "does_not_accept"):
            check_target(a, "shutterstock")

    def test_real_render_allowed_and_remote_filename_fits_adobe(self):
        a = Asset(Metadata.parse(metadata()), Path("sample.jpg"), "a" * 64, 4000, 4000, "JPEG")
        check_target(a, "shutterstock")
        self.assertLessEqual(len(a.remote_name), 30)

    def test_no_silent_title_truncation(self):
        data = metadata()
        data["title"] = "x" * 71
        a = Asset(Metadata.parse(data), Path("sample.jpg"), "a" * 64, 4000, 4000, "JPEG")
        with self.assertRaisesRegex(Problem, "70_characters"):
            check_target(a, "adobe")

    def test_dreamstime_disclosure_is_in_handoff_not_adobe_title(self):
        a = Asset(Metadata.parse(metadata(ai=True)), Path("sample.jpg"), "a" * 64, 4000, 4000, "JPEG")
        self.assertIn("Generated using AI.", csv_metadata(a, "dreamstime"))
        self.assertNotIn("Generated using AI.", csv_metadata(a, "adobe"))

    def test_png_not_silently_flattened_for_jpeg_only_target(self):
        a = Asset(Metadata.parse(metadata("sample.png")), Path("sample.png"), "a" * 64, 4000, 4000, "PNG")
        with self.assertRaisesRegex(Problem, "requires_jpeg"):
            check_target(a, "dreamstime")

    def test_invalid_dimensions_rejected(self):
        a = Asset(Metadata.parse(metadata()), Path("sample.jpg"), "a" * 64, 100, 100, "JPEG")
        with self.assertRaisesRegex(Problem, "dimensions"):
            check_target(a, "adobe")

    def test_rotating_scan_does_not_starve_new_files(self):
        self.assertEqual(batch([("a", 1), ("b", 2), ("c", 3)], 2, "b"), [("c", 3), ("a", 1)])


class StateTests(unittest.TestCase):
    def test_encrypted_round_trip_and_no_cleartext(self):
        codec = Codec(key())
        data = {"version": 1, "receipts": {}, "private": "private asset title"}
        payload = codec.encrypt(data)
        self.assertNotIn(b"private asset title", payload)
        self.assertEqual(codec.decrypt(payload), data)

    def test_wrong_key_and_tamper_fail_closed(self):
        codec = Codec(key())
        encrypted = codec.encrypt({"version": 1, "receipts": {"some": "data"}})
        with self.assertRaisesRegex(Problem, "prevent_duplicates"):
            Codec(key()).decrypt(encrypted)
        with self.assertRaises(Problem):
            codec.decrypt(encrypted[:-2] + b"XX")

    def test_invalid_key_rejected(self):
        with self.assertRaises(Problem):
            Codec("not a key")


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.inbox = self.root / "inbox"
        self.inbox.mkdir()
        self.image = self.inbox / "sample.jpg"
        Image.new("RGB", (2048, 2048), "orange").save(self.image)
        (self.inbox / "sample.jpg.json").write_text(json.dumps(metadata()))
        self.secret = key()
        self.state_path = self.root / "state.enc"
        self.state = FileState(self.state_path, self.secret)
        self.config = {"adobe": {"name": "adobe", "host": "test.invalid", "username": "fixture"}}
        self.sent = []
        owner = self

        class Sink:
            def __init__(self, config): pass
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def send(self, path, name): owner.sent.append(name)

        self.sink = Sink

    def tearDown(self):
        self.tmp.cleanup()

    def execute(self, dry=False, state=None, factory=None, **kwargs):
        def prepare(asset, target, destination):
            shutil.copyfile(asset.path, destination)
        return run(LocalInbox(self.inbox), state or self.state, self.config, dry_run=dry,
                   factory=factory or self.sink, prepare=prepare, **kwargs)

    def test_dry_run_never_contacts_transport_or_reserves_asset(self):
        factory = Mock(side_effect=AssertionError("must not connect"))
        report = self.execute(dry=True, factory=factory)
        self.assertEqual(report["counts"], {"ready_for_transfer": 1})
        self.assertFalse(self.state.data["receipts"])
        self.assertEqual(self.state.data["cursor"], "")
        factory.assert_not_called()

    def test_transfer_persistence_restart_and_duplicate_prevention(self):
        self.execute()
        self.assertEqual(len(self.sent), 1)
        restored = FileState(self.state_path, self.secret)
        result = self.execute(state=restored)
        self.assertEqual(result["counts"], {"duplicate_skipped": 1})
        self.assertEqual(len(self.sent), 1)

    def test_rename_same_content_does_not_upload_again(self):
        self.execute()
        self.image.rename(self.inbox / "renamed.jpg")
        (self.inbox / "sample.jpg.json").unlink()
        (self.inbox / "renamed.jpg.json").write_text(json.dumps(metadata("renamed.jpg")))
        result = self.execute()
        self.assertEqual(result["counts"], {"duplicate_skipped": 1})

    def test_ambiguous_transfer_is_never_blindly_retried(self):
        class Uncertain(self.sink):
            def send(inner, path, name):
                super().send(path, name)
                raise TimeoutError("potentially secret library exception")
        result = self.execute(factory=Uncertain)
        self.assertIn("transfer_uncertain_needs_review", result["counts"])
        restored = FileState(self.state_path, self.secret)
        result = self.execute(state=restored)
        self.assertIn("uncertain_needs_review", result["counts"])
        self.assertEqual(len(self.sent), 1)
        self.assertNotIn("potentially secret", json.dumps(result))

    def test_failed_reservation_prevents_network_upload(self):
        self.state.save = Mock(side_effect=Problem("state_write_failed_stop_to_prevent_duplicates"))
        with self.assertRaisesRegex(Problem, "state_write_failed"):
            self.execute()
        self.assertEqual(self.sent, [])

    def test_malformed_metadata_does_not_block_later_files(self):
        (self.inbox / "aaa-bad.json").write_text("not json")
        report = self.execute()
        self.assertIn("invalid_metadata", report["counts"])
        self.assertEqual(len(self.sent), 1)

    def test_extension_mismatch_is_not_guessed(self):
        (self.inbox / "sample.jpg.json").write_text(json.dumps(metadata("sample.png")))
        report = self.execute()
        self.assertIn("matching_image_missing", report["counts"])
        self.assertFalse(self.sent)

    def test_byte_limit_applies_before_transfer(self):
        report = self.execute(max_bytes=10)
        self.assertIn("download_limit_exceeded", report["counts"])
        self.assertFalse(self.sent)

    def test_batch_cursor_advances_and_wraps(self):
        for n in [1, 2]:
            Image.new("RGB", (2048, 2048), (n, n, n)).save(self.inbox / f"sample{n}.jpg")
            (self.inbox / f"sample{n}.jpg.json").write_text(json.dumps(metadata(f"sample{n}.jpg")))
        self.execute(limit=1)
        self.execute(limit=1)
        self.execute(limit=1)
        self.assertEqual(len(self.sent), 3)

    @unittest.skipUnless(shutil.which("exiftool"), "exiftool is installed in cloud CI")
    def test_metadata_embedding_preserves_decoded_pixels_and_keywords(self):
        asset = Asset.inspect(Metadata.parse(metadata()), self.image, 45_000_000)
        destination = self.root / "prepared.jpg"
        embed(asset, "adobe", destination)
        with Image.open(self.image) as first, Image.open(destination) as second:
            self.assertEqual(first.tobytes(), second.tobytes())
        data = json.loads(subprocess.check_output(["exiftool", "-j", "-Subject", "-Title", str(destination)]))[0]
        self.assertEqual(data["Title"], asset.metadata.title)
        self.assertEqual(data["Subject"], list(asset.metadata.keywords))


class TransportTests(unittest.TestCase):
    def test_insecure_ftp_never_allowed(self):
        with self.assertRaisesRegex(Problem, "verified_sftp_or_ftps"):
            targets_from_json(json.dumps([{"name": "dreamstime", "host": "upload.dreamstime.com", "protocol": "ftp"}]))

    def test_sftp_host_verification_required(self):
        with self.assertRaisesRegex(Problem, "known_hosts"):
            targets_from_json(json.dumps([{"name": "adobe", "host": "sftp.contributor.adobestock.com", "protocol": "sftp", "username": "test", "password": "test"}]))

    def test_ftps_encrypts_control_and_data_and_verifies_certificates(self):
        with patch("kitwise.transfer.ftplib.FTP_TLS") as tls:
            with FTPS({"host": "ftps.shutterstock.com", "username": "fixture", "password": "fixture"}):
                pass
            context = tls.call_args.kwargs["context"]
            self.assertTrue(context.check_hostname)
            self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
            tls.return_value.prot_p.assert_called_once()

    def test_connection_errors_do_not_expose_secrets(self):
        with patch("kitwise.transfer.ftplib.FTP_TLS") as tls:
            tls.return_value.login.side_effect = ValueError("user password private-host")
            with self.assertRaisesRegex(Problem, "^secure_target_connection_failed$"):
                with FTPS({"host": "test", "username": "user", "password": "password"}):
                    pass

    def test_offsite_upload_host_rejected(self):
        with self.assertRaisesRegex(Problem, "official_domain"):
            targets_from_json(json.dumps([{"name": "adobe", "host": "evil.example", "protocol": "sftp"}]))


if __name__ == "__main__":
    unittest.main()
