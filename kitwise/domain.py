from __future__ import annotations

import csv
import hashlib
import io
import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


class Problem(Exception):
    """A public, fixed error code, never an underlying exception or credential."""


TARGETS = {"adobe", "dreamstime", "shutterstock"}


def basename(value: str) -> str:
    if not isinstance(value, str) or not value or any(c in value for c in "\r\n\x00\\"):
        raise Problem("invalid_filename")
    if value != Path(value).name or value in {".", ".."}:
        raise Problem("invalid_filename")
    return value


@dataclass(frozen=True)
class Metadata:
    filename: str
    title: str
    description: str
    keywords: tuple[str, ...]
    ai_generated: bool
    targets: tuple[str, ...]
    categories: dict
    illustration: bool

    @classmethod
    def parse(cls, obj: dict) -> "Metadata":
        if not isinstance(obj, dict):
            raise Problem("invalid_metadata")
        filename = basename(obj.get("filename", ""))
        title = obj.get("title", "")
        description = obj.get("description", title)
        if not isinstance(title, str) or not 5 <= len(title.strip()) <= 200:
            raise Problem("title_required_5_to_200_characters")
        if not isinstance(description, str) or not 5 <= len(description.strip()) <= 2000:
            raise Problem("description_required")
        if type(obj.get("ai_generated")) is not bool:
            raise Problem("ai_generated_must_be_explicit_boolean")
        targets = obj.get("targets")
        if not isinstance(targets, list) or not targets or any(t not in TARGETS for t in targets):
            raise Problem("invalid_targets")
        raw_keywords = obj.get("keywords")
        if not isinstance(raw_keywords, list) or any(not isinstance(k, str) for k in raw_keywords):
            raise Problem("keywords_must_be_array")
        keywords = tuple(dict.fromkeys(k.strip().lower() for k in raw_keywords if k.strip()))
        if not 7 <= len(keywords) <= 49 or any(len(k) > 64 or "," in k for k in keywords):
            raise Problem("requires_7_to_49_distinct_keywords")
        if any(ord(c) < 32 for c in title + description + "".join(keywords)):
            raise Problem("metadata_control_characters")
        categories = obj.get("categories", {})
        if not isinstance(categories, dict):
            raise Problem("categories_must_be_object")
        illustration = obj.get("illustration", True)
        if type(illustration) is not bool:
            raise Problem("illustration_must_be_boolean")
        return cls(filename, title.strip(), description.strip(), keywords,
                   obj["ai_generated"], tuple(dict.fromkeys(targets)), categories, illustration)


@dataclass(frozen=True)
class Asset:
    metadata: Metadata
    path: Path
    digest: str
    width: int
    height: int
    format: str

    @classmethod
    def inspect(cls, metadata: Metadata, path: Path, max_bytes: int) -> "Asset":
        if path.stat().st_size > max_bytes:
            raise Problem("file_too_large")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        try:
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                if image.format not in {"JPEG", "PNG"}:
                    raise Problem("only_jpeg_and_png_supported")
                if image.mode not in {"RGB", "RGBA"}:
                    raise Problem("rgb_image_required")
                expected = {"JPEG": {".jpg", ".jpeg"}, "PNG": {".png"}}
                if Path(metadata.filename).suffix.lower() not in expected[image.format]:
                    raise Problem("filename_does_not_match_image_format")
                image.load()
                return cls(metadata, path, digest, image.width, image.height, image.format)
        except Problem:
            raise
        except Exception:
            raise Problem("invalid_or_unsafe_image") from None

    @property
    def remote_name(self) -> str:
        return "kw_" + self.digest[:20] + (".jpg" if self.format == "JPEG" else ".png")


def check_target(asset: Asset, target: str) -> None:
    m = asset.metadata
    if target == "shutterstock" and m.ai_generated:
        raise Problem("shutterstock_does_not_accept_contributor_ai")
    minimum = 3_000_000 if target == "dreamstime" else 4_000_000
    if not minimum <= asset.width * asset.height <= (70_000_000 if target == "dreamstime" else 100_000_000):
        raise Problem("image_dimensions_outside_target_limits")
    if target != "adobe" and asset.format != "JPEG":
        raise Problem("target_requires_jpeg_no_automatic_flattening")
    if target == "adobe":
        if len(m.title) > 70 or any(c in m.title for c in ",\r\n"):
            raise Problem("adobe_title_requires_at_most_70_characters_no_commas")
        if re.search(r"\b(?:generative\s+ai|ai[- ]generated)\b", m.title, re.I):
            raise Problem("adobe_ai_label_belongs_in_portal_not_title")
    if target in {"adobe", "shutterstock"}:
        numbers = str(m.categories.get(target, "")).split(",")
        if not numbers or any(not n.strip().isdigit() for n in numbers):
            raise Problem("numeric_target_category_required")
        if target == "adobe" and (len(numbers) != 1 or not 1 <= int(numbers[0]) <= 21):
            raise Problem("adobe_category_must_be_1_to_21")


def csv_metadata(asset: Asset, target: str) -> str:
    m = asset.metadata
    out = io.StringIO(newline="")
    writer = csv.writer(out)
    if target == "adobe":
        writer.writerow(["Filename", "Title", "Keywords", "Category", "Releases"])
        writer.writerow([asset.remote_name, m.title, ",".join(m.keywords), m.categories[target], ""])
    elif target == "shutterstock":
        writer.writerow(["Filename", "Description", "Keywords", "Categories", "Illustration"])
        writer.writerow([asset.remote_name, m.description, ",".join(m.keywords), m.categories[target],
                         "Yes" if m.illustration else "No"])
    else:
        # This is an operator handoff, NOT a claimed Dreamstime import schema.
        writer.writerow(["Filename", "Title", "Description", "Keywords", "Required portal category"])
        description = m.description + (" Generated using AI." if m.ai_generated else "")
        writer.writerow([asset.remote_name, m.title, description, ",".join(m.keywords),
                         "Illustrations & Clipart/Generative AI" if m.ai_generated else "Choose relevant categories"])
    return out.getvalue()


def handoff(asset: Asset, target: str) -> list[str]:
    steps = ["Check that the uploaded file appears in the contributor portal."]
    if target in {"adobe", "shutterstock"}:
        steps.append("Import the generated CSV in the portal; CSV is not sent over FTP/SFTP.")
    else:
        steps.append("Apply the title, description, keywords and categories from the handoff report.")
    if asset.metadata.ai_generated:
        steps.append("Enable Created using generative AI tools." if target == "adobe" else
                     "Select Illustrations & Clipart/Generative AI and keep the AI disclosure in the description.")
    steps.append("Attach required releases, verify all fields, and submit for review in the portal.")
    return steps
