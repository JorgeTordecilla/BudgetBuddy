from __future__ import annotations

from pathlib import Path
import sys
import yaml

SPEC_PATH = Path("backend/openapi.yaml")
SUCCESS_MEDIA = "application/vnd.budgetbuddy.v1+json"
PROBLEM_MEDIA = "application/problem+json"
CANONICAL_ERROR_STATUSES = {"400", "401", "403", "406", "409", "429"}


def _load_spec() -> dict:
    return yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8"))


def _has_example(media_obj: dict, components: dict) -> bool:
    if "example" in media_obj or "examples" in media_obj:
        return True

    schema = media_obj.get("schema")
    if not isinstance(schema, dict):
        return False
    ref = schema.get("$ref")
    if not isinstance(ref, str):
        return False

    schema_name = ref.split("/")[-1]
    schema_obj = components.get("schemas", {}).get(schema_name, {})
    return "example" in schema_obj or "examples" in schema_obj


def _validate_operations(spec: dict) -> list[str]:
    errors: list[str] = []
    components = spec.get("components", {})
    paths = spec.get("paths", {})

    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method.lower() not in {"get", "post", "patch", "delete"}:
                continue

            responses = operation.get("responses", {})
            success_has_example = False
            error_has_example = False

            for code, response in responses.items():
                code_s = str(code)
                content = response.get("content", {})

                if code_s.startswith("2"):
                    media = content.get(SUCCESS_MEDIA) or content.get("text/csv")
                    if isinstance(media, dict) and _has_example(media, components):
                        success_has_example = True

                if code_s.startswith("4") or code_s.startswith("5"):
                    media = content.get(PROBLEM_MEDIA)
                    if isinstance(media, dict) and _has_example(media, components):
                        error_has_example = True

            if not success_has_example and any(str(c).startswith("2") and "content" in responses[c] for c in responses):
                errors.append(f"{method.upper()} {path}: missing success example")
            if not error_has_example and any(str(c).startswith(("4", "5")) for c in responses):
                errors.append(f"{method.upper()} {path}: missing error example")

    return errors


def _validate_problem_catalog(spec: dict) -> list[str]:
    errors: list[str] = []
    catalog = spec.get("components", {}).get("x-problem-details-catalog", [])
    statuses = {str(item.get("status")) for item in catalog if isinstance(item, dict)}
    missing = sorted(CANONICAL_ERROR_STATUSES - statuses)
    if missing:
        errors.append(f"problem catalog missing canonical statuses: {', '.join(missing)}")
    return errors


def main() -> int:
    if not SPEC_PATH.exists():
        print(f"ERROR: missing {SPEC_PATH}")
        return 1

    spec = _load_spec()
    if spec.get("openapi") != "3.1.0":
        print("ERROR: expected openapi: 3.1.0")
        return 1

    errors = []
    errors.extend(_validate_operations(spec))
    errors.extend(_validate_problem_catalog(spec))

    if errors:
        print("OpenAPI validation failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("OpenAPI validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

