import shutil
import subprocess

from .domain import Problem


def embed(asset, target, destination):
    """Metadata only; no resizing, re-encoding, upscaling or source overwrite."""
    executable = shutil.which("exiftool")
    if not executable:
        raise Problem("exiftool_not_installed")
    m = asset.metadata
    description = m.description + (" Generated using AI." if target == "dreamstime" and m.ai_generated else "")
    args = [executable, "-charset", "IPTC=UTF8",
            "-XMP-dc:Title=" + m.title, "-XMP-dc:Description=" + description,
            "-XMP-dc:Subject=", "-IPTC:Keywords="]
    for keyword in m.keywords:
        args.extend(["-XMP-dc:Subject+=" + keyword, "-IPTC:Keywords+=" + keyword])
    args.extend(["-IPTC:ObjectName=" + m.title, "-IPTC:Caption-Abstract=" + description,
                 "-o", str(destination), str(asset.path)])
    result = subprocess.run(args, capture_output=True, timeout=30, check=False)
    if result.returncode or not destination.is_file():
        raise Problem("metadata_embedding_failed")
