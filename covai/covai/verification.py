"""
Verification runner for `covai verify`.

Runs two Jest passes for the last analyzed files:
1. baseline  -> manually written tests only
2. candidate -> manual tests + ai_generated_tests/**

Then reports failed tests and coverage deltas for each analyzed file.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
import json
from pathlib import Path
import shutil
import subprocess
from typing import Optional

from covai.collector import Collector
from covai.config import CovaiConfig


LAST_ANALYZED_PATH = Path("covai/.tmp/last_analyzed.json")
JEST_BIN = ["node", "--experimental-vm-modules", "node_modules/jest/bin/jest.js"]


@dataclass
class VerificationFailure:
    test_file: str
    test_name: str
    message: str

    def to_dict(self) -> dict:
        return {
            "test_file": self.test_file,
            "test_name": self.test_name,
            "message": self.message,
        }


@dataclass
class VerificationRun:
    mode: str
    exit_code: int
    coverage: dict[str, float]
    failures_by_file: dict[str, list[VerificationFailure]] = field(default_factory=dict)
    unmapped_failures: list[VerificationFailure] = field(default_factory=list)


@dataclass
class VerificationFileResult:
    file_path: str
    before_coverage: Optional[float]
    after_coverage: Optional[float]
    failures: list[VerificationFailure] = field(default_factory=list)

    @property
    def coverage_delta(self) -> Optional[float]:
        if self.before_coverage is None or self.after_coverage is None:
            return None
        return self.after_coverage - self.before_coverage

    def to_dict(self) -> dict:
        return {
            "file_path": self.file_path,
            "before_coverage": self.before_coverage,
            "after_coverage": self.after_coverage,
            "coverage_delta": self.coverage_delta,
            "failures": [failure.to_dict() for failure in self.failures],
        }


class VerificationRunner:
    def __init__(self, config: CovaiConfig, collector: Collector):
        self.config = config
        self.collector = collector
        self.project_root = Path(collector.project_root)
        self.tmp_dir = self.project_root / "covai" / ".tmp"
        self.tmp_dir.mkdir(parents=True, exist_ok=True)

    def run(self, target_file: Optional[str] = None) -> dict:
        target_files = self._load_target_files(target_file)
        grouped_files = self._group_files(target_files)

        all_results: list[VerificationFileResult] = []
        unmapped_failures: list[VerificationFailure] = []
        project_runs: dict[str, dict[str, int]] = {}

        for project_name, files in grouped_files.items():
            if not files:
                continue

            baseline = self._run_project(project_name, files, include_generated=False)
            candidate = self._run_project(project_name, files, include_generated=True)
            project_runs[project_name] = {
                "baseline_exit_code": baseline.exit_code,
                "candidate_exit_code": candidate.exit_code,
            }

            for file_path in files:
                all_results.append(
                    VerificationFileResult(
                        file_path=file_path,
                        before_coverage=baseline.coverage.get(file_path),
                        after_coverage=candidate.coverage.get(file_path),
                        failures=candidate.failures_by_file.get(file_path, []),
                    )
                )

            unmapped_failures.extend(candidate.unmapped_failures)

        return {
            "results": [result.to_dict() for result in sorted(all_results, key=lambda item: item.file_path)],
            "project_runs": project_runs,
            "unmapped_failures": [failure.to_dict() for failure in unmapped_failures],
        }

    def print_report(self, payload: dict) -> None:
        print("\n  Verification report:\n")
        for result in payload["results"]:
            before = result["before_coverage"]
            after = result["after_coverage"]
            delta = result["coverage_delta"]

            print(f"  📄 {result['file_path']}")
            if result["failures"]:
                print(f"     Failed test cases: {len(result['failures'])}")
                for failure in result["failures"]:
                    print(f"       - {failure['test_name']}")
                    print(f"         {failure['message']}")
            else:
                print("     Failed test cases: none")

            print(
                "     Coverage: "
                f"{self._format_pct(before)} -> {self._format_pct(after)} "
                f"({self._format_delta(delta)})"
            )
            print()

        if payload["unmapped_failures"]:
            print("  Other failed test suites:")
            for failure in payload["unmapped_failures"]:
                print(f"    - {failure['test_file']}: {failure['message']}")
            print()

    def _run_project(
        self,
        project_name: str,
        files: list[str],
        include_generated: bool,
    ) -> VerificationRun:
        mode = "candidate" if include_generated else "baseline"
        coverage_dir = self.tmp_dir / f"{project_name}.{mode}.coverage"
        results_path = self.tmp_dir / f"{project_name}.{mode}.results.json"
        config_path = self.tmp_dir / f"jest.{project_name}.{mode}.config.js"

        if coverage_dir.exists():
            shutil.rmtree(coverage_dir)
        if results_path.exists():
            results_path.unlink()

        source_to_tests = self._build_source_to_tests(files, include_generated=include_generated)
        self._write_temp_jest_config(
            config_path=config_path,
            project_name=project_name,
            source_files=files,
            source_to_tests=source_to_tests,
            coverage_dir=coverage_dir,
        )

        cmd = [
            *JEST_BIN,
            "--config",
            str(config_path),
            "--runInBand",
            "--json",
            f"--outputFile={results_path}",
        ]
        completed = subprocess.run(
            cmd,
            cwd=self.project_root,
            capture_output=True,
            text=True,
        )

        coverage_map = self._read_coverage_map(coverage_dir / "lcov.info")
        failures_by_file, unmapped_failures = self._parse_failures(results_path, source_to_tests)

        return VerificationRun(
            mode=mode,
            exit_code=completed.returncode,
            coverage=coverage_map,
            failures_by_file=failures_by_file,
            unmapped_failures=unmapped_failures,
        )

    def _load_target_files(self, target_file: Optional[str]) -> list[str]:
        if target_file:
            return [self.collector.normalize_path(target_file)]

        generated_files = self._load_generated_target_files()

        analyzed_path = self.project_root / LAST_ANALYZED_PATH
        manifest_files: list[str] = []
        if analyzed_path.exists():
            data = json.loads(analyzed_path.read_text())
            manifest_files = [self.collector.normalize_path(path) for path in data.get("files", [])]

        files = sorted(set(manifest_files) | set(generated_files))
        if files:
            return files

        raise ValueError(
            "No analyzed or generated files were found. Run `covai analyze` or `covai run` first, "
            "or pass `covai verify --file <path>`."
        )

    def _group_files(self, file_paths: list[str]) -> dict[str, list[str]]:
        grouped: dict[str, list[str]] = {"backend": [], "frontend": []}
        for file_path in file_paths:
            if file_path.startswith("client/"):
                grouped["frontend"].append(file_path)
            else:
                grouped["backend"].append(file_path)
        return grouped

    def _build_source_to_tests(
        self,
        source_files: list[str],
        include_generated: bool,
    ) -> dict[str, list[str]]:
        mapping: dict[str, list[str]] = {}
        for source_file in source_files:
            tests = list(self._find_manual_tests(source_file))
            if include_generated:
                generated_test = self._generated_test_path(source_file)
                if (self.project_root / generated_test).exists():
                    tests.append(generated_test)
            mapping[source_file] = sorted(set(tests))
        return mapping

    def _write_temp_jest_config(
        self,
        config_path: Path,
        project_name: str,
        source_files: list[str],
        source_to_tests: dict[str, list[str]],
        coverage_dir: Path,
    ) -> None:
        base_config_name = (
            "jest.frontend.config.js" if project_name == "frontend" else "jest.backend.config.js"
        )
        relative_import = Path("../../") / base_config_name

        source_globs = [f"<rootDir>/{path}" for path in source_files]
        test_globs = [
            f"<rootDir>/{test_path}"
            for tests in source_to_tests.values()
            for test_path in tests
        ]

        config_text = "\n".join(
            [
                f'import baseConfig from "{relative_import.as_posix()}";',
                f"const rootDir = {json.dumps(str(self.project_root))};",
                f"const targetedCoverageFiles = {json.dumps(source_globs)};",
                f"const testMatches = {json.dumps(test_globs)};",
                "",
                "export default {",
                "  ...baseConfig,",
                "  rootDir,",
                "  passWithNoTests: true,",
                "  collectCoverage: true,",
                "  collectCoverageFrom: targetedCoverageFiles,",
                f"  coverageDirectory: {json.dumps(str(coverage_dir))},",
                '  coverageReporters: ["json", "lcov", "text-summary"],',
                "  coverageThreshold: undefined,",
                "  testMatch: testMatches,",
                "  testPathIgnorePatterns: [...(baseConfig.testPathIgnorePatterns || [])],",
                "};",
                "",
            ]
        )
        config_path.write_text(config_text)

    def _read_coverage_map(self, coverage_path: Path) -> dict[str, float]:
        if not coverage_path.exists():
            return {}
        coverage_entries = self.collector.collect_from_coverage_path(str(coverage_path))
        return {entry.file_path: entry.coverage_pct for entry in coverage_entries}

    def _parse_failures(
        self,
        results_path: Path,
        source_to_tests: dict[str, list[str]],
    ) -> tuple[dict[str, list[VerificationFailure]], list[VerificationFailure]]:
        if not results_path.exists():
            return {}, []

        results = json.loads(results_path.read_text())
        test_to_source: dict[str, str] = {}
        for source_file, test_files in source_to_tests.items():
            for test_file in test_files:
                test_to_source[self.collector.normalize_path(test_file)] = source_file

        failures_by_file: dict[str, list[VerificationFailure]] = defaultdict(list)
        unmapped_failures: list[VerificationFailure] = []

        for suite in results.get("testResults", []):
            suite_path = self.collector.normalize_path(suite.get("name", ""))
            source_file = test_to_source.get(suite_path)

            suite_failures: list[VerificationFailure] = []
            if suite.get("message"):
                suite_failures.append(
                    VerificationFailure(
                        test_file=suite_path,
                        test_name="Test suite failed to run",
                        message=self._summarize_failure_message(suite["message"]),
                    )
                )

            for assertion in suite.get("assertionResults", []):
                if assertion.get("status") != "failed":
                    continue
                failure_text = "\n".join(assertion.get("failureMessages") or [])
                suite_failures.append(
                    VerificationFailure(
                        test_file=suite_path,
                        test_name=assertion.get("fullName") or assertion.get("title", "Unnamed test"),
                        message=self._summarize_failure_message(failure_text),
                    )
                )

            if not suite_failures:
                continue

            if source_file:
                failures_by_file[source_file].extend(suite_failures)
            else:
                unmapped_failures.extend(suite_failures)

        return failures_by_file, unmapped_failures

    def _find_manual_tests(self, source_file: str) -> list[str]:
        source_path = Path(source_file)
        test_file_pattern = self.config.get_language_config().test_file_pattern
        test_filename = test_file_pattern.replace("{name}", source_path.stem)

        candidates = []
        for search_dir in ("tests", "test", "__tests__", "spec", "."):
            candidate = Path(search_dir) / test_filename
            if (self.project_root / candidate).exists():
                candidates.append(candidate.as_posix())

        alongside = source_path.parent / test_filename
        if (self.project_root / alongside).exists():
            candidates.append(alongside.as_posix())

        return sorted(set(candidates))

    def _generated_test_path(self, source_file: str) -> str:
        source_path = Path(source_file)
        generated_name = f"{source_path.stem}.test{source_path.suffix}"
        return (Path("ai_generated_tests") / source_path.with_name(generated_name)).as_posix()

    def _load_generated_target_files(self) -> list[str]:
        generated_root = self.project_root / "ai_generated_tests"
        if not generated_root.exists():
            return []

        files = []
        for test_file in generated_root.rglob("*.test.*"):
            relative_test = test_file.relative_to(generated_root)
            stem = relative_test.stem
            if ".test" not in stem:
                continue
            source_stem = stem.rsplit(".test", 1)[0]
            source_name = f"{source_stem}{test_file.suffix}"
            source_path = relative_test.with_name(source_name)
            files.append(self.collector.normalize_path(source_path.as_posix()))

        return sorted(set(files))

    def _summarize_failure_message(self, message: str) -> str:
        lines = [line.strip() for line in message.splitlines() if line.strip()]
        if not lines:
            return "No failure details were provided by Jest."
        return " | ".join(lines[:2])

    def _format_pct(self, value: Optional[float]) -> str:
        if value is None:
            return "n/a"
        return f"{value:.1f}%"

    def _format_delta(self, value: Optional[float]) -> str:
        if value is None:
            return "n/a"
        sign = "+" if value >= 0 else ""
        return f"{sign}{value:.1f}%"
