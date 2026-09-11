from __future__ import annotations

import ast
import importlib
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = REPO_ROOT / "src"
INTERNAL_TOP_LEVEL = {
    path.stem
    for path in SRC_ROOT.glob("*.py")
    if path.name != "__init__.py"
}
INTERNAL_PACKAGES = {
    path.name
    for path in SRC_ROOT.iterdir()
    if path.is_dir() and (path / "__init__.py").exists()
}


def module_name_for(path: Path) -> str:
    relative = path.relative_to(SRC_ROOT).with_suffix("")
    parts = list(relative.parts)
    if parts[-1] == "__init__":
        parts.pop()
    return ".".join(parts)


def module_path(module_name: str) -> Path | None:
    parts = module_name.split(".")
    package_path = SRC_ROOT.joinpath(*parts, "__init__.py")
    file_path = SRC_ROOT.joinpath(*parts).with_suffix(".py")
    if package_path.exists():
        return package_path
    if file_path.exists():
        return file_path
    return None


def is_internal_module(module_name: str) -> bool:
    first = module_name.split(".", 1)[0]
    return first in INTERNAL_TOP_LEVEL or first in INTERNAL_PACKAGES


def static_names(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    names: set[str] = set()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for target in targets:
                if isinstance(target, ast.Name):
                    names.add(target.id)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.asname or alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name != "*":
                    names.add(alias.asname or alias.name)
    tree_names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
    if "__getattr__" in tree_names:
        for node in tree.body:
            if isinstance(node, ast.Assign) and any(
                isinstance(target, ast.Name) and target.id in {"__all__", "_EXPORTS"}
                for target in node.targets
            ):
                if isinstance(node.value, (ast.List, ast.Tuple, ast.Set)):
                    names.update(
                        element.value
                        for element in node.value.elts
                        if isinstance(element, ast.Constant) and isinstance(element.value, str)
                    )
                elif isinstance(node.value, ast.Dict):
                    names.update(
                        key.value
                        for key in node.value.keys()
                        if isinstance(key, ast.Constant) and isinstance(key.value, str)
                    )
    return names


def audit_static_imports() -> list[str]:
    findings: list[str] = []
    for path in sorted(SRC_ROOT.rglob("*.py")):
        module_name = module_name_for(path)
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    target = alias.name
                    if is_internal_module(target) and module_path(target) is None:
                        findings.append(
                            f"{path.relative_to(REPO_ROOT)}:{node.lineno}: "
                            f"module not found: {target}"
                        )
            elif isinstance(node, ast.ImportFrom) and node.level == 0:
                target = node.module or ""
                if not is_internal_module(target):
                    continue
                target_path = module_path(target)
                if target_path is None:
                    findings.append(
                        f"{path.relative_to(REPO_ROOT)}:{node.lineno}: "
                        f"module not found: {target}"
                    )
                    continue
                available = static_names(target_path)
                for alias in node.names:
                    if alias.name == "*":
                        continue
                    imported_name = alias.name
                    if imported_name not in available:
                        findings.append(
                            f"{path.relative_to(REPO_ROOT)}:{node.lineno}: "
                            f"{target} has no statically declared name {imported_name!r}"
                        )
    return findings


def import_all_modules() -> list[str]:
    findings: list[str] = []
    sys.path.insert(0, str(SRC_ROOT))
    for path in sorted(SRC_ROOT.rglob("*.py")):
        name = module_name_for(path)
        try:
            importlib.import_module(name)
        except Exception as exc:
            findings.append(f"{name}: {type(exc).__name__}: {exc}")
    return findings


def main() -> int:
    static_findings = audit_static_imports()
    runtime_findings = import_all_modules()
    print("STATIC IMPORT AUDIT")
    if static_findings:
        for finding in static_findings:
            print(f"ERROR {finding}")
    else:
        print("OK no missing internal module/name references")

    print("\nRUNTIME MODULE IMPORT AUDIT")
    if runtime_findings:
        for finding in runtime_findings:
            print(f"ERROR {finding}")
    else:
        print("OK every src module imported successfully")

    return int(bool(static_findings or runtime_findings))


if __name__ == "__main__":
    raise SystemExit(main())
