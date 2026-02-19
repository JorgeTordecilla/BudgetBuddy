from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import json
import re
import sys
import yaml

SPEC_PATH = Path("backend/openapi.yaml")
TS_CONFIG = Path("sdk/config/typescript-generator.json")
PY_CONFIG = Path("sdk/config/python-generator.json")


@dataclass(frozen=True)
class Operation:
    method: str
    path: str
    operation_id: str


def _load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _operation_name(method: str, path: str) -> str:
    cleaned = path.strip("/").replace("{", "").replace("}", "")
    parts = [p for p in re.split(r"[^a-zA-Z0-9]+", cleaned) if p]
    return method.lower() + "".join(p.capitalize() for p in parts)


def _collect_operations(spec: dict) -> list[Operation]:
    operations: list[Operation] = []
    for path, path_item in spec.get("paths", {}).items():
        for method in ("get", "post", "patch", "delete"):
            if method not in path_item:
                continue
            operations.append(Operation(method=method.upper(), path=path, operation_id=_operation_name(method, path)))
    return operations


def _ts_client(spec_hash: str, ts_cfg: dict, ops: list[Operation]) -> str:
    lines = [
        "/* AUTO-GENERATED FILE. DO NOT EDIT.",
        f" * source: {SPEC_PATH.as_posix()}",
        f" * generator: {ts_cfg.get('generator_name')}@{ts_cfg.get('generator_version')}",
        f" * spec_sha256: {spec_hash}",
        " */",
        "",
        "export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';",
        "export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };",
        "",
        "export interface SDKConfig {",
        "  baseUrl: string;",
        "  defaultHeaders?: Record<string, string>;",
        "}",
        "",
        "export class BudgetBuddyClient {",
        "  private readonly baseUrl: string;",
        "  private readonly defaultHeaders: Record<string, string>;",
        "",
        "  constructor(cfg: SDKConfig) {",
        "    this.baseUrl = cfg.baseUrl.replace(/\\/$/, '');",
        "    this.defaultHeaders = cfg.defaultHeaders ?? {};",
        "  }",
        "",
        "  private async request(method: HttpMethod, path: string, body?: JsonValue, headers?: Record<string, string>): Promise<Response> {",
        "    const finalHeaders: Record<string, string> = { ...this.defaultHeaders, ...(headers ?? {}) };",
        "    if (body !== undefined && !finalHeaders['content-type']) {",
        "      finalHeaders['content-type'] = 'application/vnd.budgetbuddy.v1+json';",
        "    }",
        "    const res = await fetch(`${this.baseUrl}${path}`, {",
        "      method,",
        "      headers: finalHeaders,",
        "      body: body === undefined ? undefined : JSON.stringify(body),",
        "    });",
        "    return res;",
        "  }",
        "",
    ]

    for op in ops:
        lines.extend(
            [
                f"  async {op.operation_id}(path: string = '{op.path}', body?: JsonValue, headers?: Record<string, string>): Promise<Response> {{",
                f"    return this.request('{op.method}', path, body, headers);",
                "  }",
                "",
            ]
        )

    lines.append("}")
    lines.append("")
    return "\n".join(lines)


def _py_client(spec_hash: str, py_cfg: dict, ops: list[Operation]) -> str:
    lines = [
        '"""AUTO-GENERATED FILE. DO NOT EDIT.',
        f"source: {SPEC_PATH.as_posix()}",
        f"generator: {py_cfg.get('generator_name')}@{py_cfg.get('generator_version')}",
        f"spec_sha256: {spec_hash}",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "import json",
        "from dataclasses import dataclass, field",
        "from typing import Any, Mapping",
        "from urllib.request import Request, urlopen",
        "",
        "",
        "@dataclass(slots=True)",
        "class BudgetBuddyClient:",
        "    base_url: str",
        "    default_headers: dict[str, str] = field(default_factory=dict)",
        "",
        "    def _request(self, method: str, path: str, body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:",
        "        all_headers = dict(self.default_headers)",
        "        if headers:",
        "            all_headers.update(headers)",
        "        data = None",
        "        if body is not None:",
        "            data = json.dumps(body).encode('utf-8')",
        "            all_headers.setdefault('content-type', 'application/vnd.budgetbuddy.v1+json')",
        "        req = Request(f\"{self.base_url.rstrip('/')}\" + path, data=data, method=method, headers=all_headers)",
        "        with urlopen(req) as response:  # nosec B310 - expected SDK HTTP operation",
        "            return response.status, response.read()",
        "",
    ]

    for op in ops:
        lines.extend(
            [
                f"    def {op.operation_id}(self, path: str = '{op.path}', body: Any = None, headers: Mapping[str, str] | None = None) -> tuple[int, bytes]:",
                f"        return self._request('{op.method}', path, body=body, headers=headers)",
                "",
            ]
        )

    return "\n".join(lines)


def _py_init(spec_hash: str) -> str:
    return "\n".join(
        [
            '"""Generated BudgetBuddy Python SDK."""',
            "",
            'from .client import BudgetBuddyClient',
            "",
            f'SPEC_SHA256 = "{spec_hash}"',
            "",
            '__all__ = ["BudgetBuddyClient", "SPEC_SHA256"]',
            "",
        ]
    )


def _ts_index(spec_hash: str) -> str:
    return "\n".join(
        [
            "/* AUTO-GENERATED FILE. DO NOT EDIT. */",
            f"export const SPEC_SHA256 = '{spec_hash}';",
            "export * from './client';",
            "",
        ]
    )


def _sdk_readme(ts_cfg: dict, py_cfg: dict) -> str:
    return "\n".join(
        [
            "# SDK Generation",
            "",
            "Generated clients are deterministic and derived from `backend/openapi.yaml`.",
            "",
            f"- TypeScript generator: `{ts_cfg.get('generator_name')}@{ts_cfg.get('generator_version')}`",
            f"- Python generator: `{py_cfg.get('generator_name')}@{py_cfg.get('generator_version')}`",
            "",
            "Regenerate locally:",
            "",
            "```bat",
            "backend\\.venv\\Scripts\\python.exe tools\\generate_sdks.py",
            "```",
            "",
            "Check for drift without writing files:",
            "",
            "```bat",
            "backend\\.venv\\Scripts\\python.exe tools\\generate_sdks.py --check",
            "```",
            "",
        ]
    )


def _generate_files() -> dict[Path, str]:
    spec_text = SPEC_PATH.read_text(encoding="utf-8")
    spec_hash = sha256(spec_text.encode("utf-8")).hexdigest()
    spec = _load_yaml(SPEC_PATH)
    ts_cfg = _load_json(TS_CONFIG)
    py_cfg = _load_json(PY_CONFIG)
    ops = _collect_operations(spec)

    return {
        Path("sdk/typescript/src/client.ts"): _ts_client(spec_hash, ts_cfg, ops),
        Path("sdk/typescript/src/index.ts"): _ts_index(spec_hash),
        Path("sdk/python/budgetbuddy_sdk/client.py"): _py_client(spec_hash, py_cfg, ops),
        Path("sdk/python/budgetbuddy_sdk/__init__.py"): _py_init(spec_hash),
        Path("sdk/README.md"): _sdk_readme(ts_cfg, py_cfg),
    }


def _write(files: dict[Path, str]) -> None:
    for path, content in files.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")


def _check(files: dict[Path, str]) -> int:
    changed: list[str] = []
    for path, expected in files.items():
        if not path.exists():
            changed.append(f"missing: {path.as_posix()}")
            continue
        current = path.read_text(encoding="utf-8")
        if current != expected:
            changed.append(f"changed: {path.as_posix()}")

    if changed:
        print("SDK artifacts are out of date:")
        for entry in changed:
            print(f"- {entry}")
        print("Run: backend/.venv/Scripts/python.exe tools/generate_sdks.py")
        return 1

    print("SDK artifacts are up to date.")
    return 0


def main(argv: list[str]) -> int:
    if not SPEC_PATH.exists():
        print(f"ERROR: missing {SPEC_PATH.as_posix()}")
        return 1
    if not TS_CONFIG.exists() or not PY_CONFIG.exists():
        print("ERROR: missing SDK generator config files under sdk/config/")
        return 1

    files = _generate_files()
    if "--check" in argv:
        return _check(files)

    _write(files)
    print("SDK generation completed.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

