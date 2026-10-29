"""Supported encrypted file transfers only; no portal cookie scraping."""
import ftplib
import hashlib
import json
import posixpath
import ssl

from .domain import Problem, TARGETS


def targets_from_json(value):
    try:
        items = json.loads(value)
    except Exception:
        raise Problem("invalid_targets_json") from None
    if not isinstance(items, list) or not items:
        raise Problem("at_least_one_target_required")
    result = {}
    domains = {"adobe": (".adobestock.com", ".adobe.com"),
               "shutterstock": ("ftps.shutterstock.com",),
               "dreamstime": ("upload.dreamstime.com",)}
    for item in items:
        if not isinstance(item, dict) or item.get("name") not in TARGETS:
            raise Problem("unknown_target")
        name = item["name"]
        if name in result:
            raise Problem("duplicate_target")
        host = item.get("host", "").lower()
        if not any(host.endswith(d) if d.startswith(".") else host == d for d in domains[name]):
            raise Problem("target_host_not_in_official_domain")
        if item.get("protocol") not in {"sftp", "ftps"}:
            raise Problem("only_verified_sftp_or_ftps_supported")
        if not item.get("username") or not item.get("password"):
            raise Problem("target_credentials_missing")
        if item["protocol"] == "sftp" and not item.get("known_hosts"):
            raise Problem("sftp_known_hosts_required")
        if name == "shutterstock" and item["protocol"] != "ftps":
            raise Problem("shutterstock_requires_ftps")
        folder = item.get("remote_dir", ".")
        if any(c in folder for c in "\x00\r\n") or ".." in folder.split("/"):
            raise Problem("invalid_remote_directory")
        result[name] = item
    return result


def receipt_key(config, digest):
    account = f"{config['name']}\x00{config['host']}\x00{config['username']}\x00{config.get('remote_dir', '.')}\x00{digest}"
    return hashlib.sha256(account.encode()).hexdigest()


class FTPS:
    def __init__(self, config):
        self.config = config
        self.client = None

    def __enter__(self):
        try:
            self.client = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=45)
            self.client.connect(self.config["host"], int(self.config.get("port", 21)))
            # login() negotiates AUTH TLS before sending the password.
            self.client.login(self.config["username"], self.config["password"])
            self.client.prot_p()
            self.client.set_pasv(True)
            self.client.cwd(self.config.get("remote_dir", "."))
            return self
        except Exception:
            self.__exit__(None, None, None)
            raise Problem("secure_target_connection_failed") from None

    def send(self, path, name):
        with path.open("rb") as stream:
            self.client.storbinary("STOR " + name, stream, blocksize=65536)

    def __exit__(self, *args):
        if self.client:
            self.client.close()


class SFTP:
    def __init__(self, config):
        self.config = config
        self.client = None
        self.sftp = None

    def __enter__(self):
        import paramiko
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.RejectPolicy())
            for line in self.config["known_hosts"].splitlines():
                entry = paramiko.hostkeys.HostKeyEntry.from_line(line)
                if entry:
                    for hostname in entry.hostnames:
                        self.client.get_host_keys().add(hostname, entry.key.get_name(), entry.key)
            self.client.connect(hostname=self.config["host"], port=int(self.config.get("port", 22)),
                                username=self.config["username"], password=self.config["password"],
                                look_for_keys=False, allow_agent=False, timeout=30,
                                auth_timeout=30, banner_timeout=30)
            self.sftp = self.client.open_sftp()
            self.sftp.get_channel().settimeout(60)
            return self
        except Exception:
            self.__exit__(None, None, None)
            raise Problem("secure_target_connection_failed") from None

    def send(self, path, name):
        remote = posixpath.join(self.config.get("remote_dir", "."), name)
        self.sftp.put(str(path), remote, confirm=True)

    def __exit__(self, *args):
        if self.sftp:
            self.sftp.close()
        if self.client:
            self.client.close()


def transport(config):
    return SFTP(config) if config["protocol"] == "sftp" else FTPS(config)
