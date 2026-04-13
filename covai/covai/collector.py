"""
Layer 1: Collector
Parses coverage reports into normalized FileCoverage objects.
Supports: coverage.xml (Python/pytest-cov), lcov.info (JS/TS)
"""

import os
import re
import fnmatch
import xml.etree.ElementTree as ET
from typing import Optional

from covai.models import FileCoverage
from covai.config import CovaiConfig


# ---------------------------------------------------------------------------
# Format parsers
# ---------------------------------------------------------------------------

def _parse_coverage_xml(path: str) -> list[FileCoverage]:
    """Parse pytest-cov / Cobertura XML format."""
    results = []
    tree = ET.parse(path)
    root = tree.getroot()

    for cls in root.iter("class"):
        filename = cls.get("filename", "")
        line_rate = float(cls.get("line-rate", 0)) * 100

        uncovered = []
        total = 0
        covered_count = 0

        for line in cls.iter("line"):
            total += 1
            hits = int(line.get("hits", 0))
            if hits == 0:
                uncovered.append(int(line.get("number", 0)))
            else:
                covered_count += 1

        results.append(FileCoverage(
            file_path=filename,
            coverage_pct=round(line_rate, 2),
            uncovered_lines=uncovered,
            total_lines=total,
            covered_lines=covered_count,
        ))

    return results


def _parse_lcov(path: str) -> list[FileCoverage]:
    """Parse LCOV format (.info files used by Jest/Istanbul)."""
    results = []
    current_file = None
    lines_found = 0
    lines_hit = 0
    uncovered = []

    with open(path) as f:
        for raw_line in f:
            line = raw_line.strip()

            if line.startswith("SF:"):
                current_file = line[3:]
                lines_found = 0
                lines_hit = 0
                uncovered = []

            elif line.startswith("DA:"):
                # DA:<line_number>,<hit_count>
                parts = line[3:].split(",")
                if len(parts) >= 2:
                    line_num = int(parts[0])
                    hits = int(parts[1])
                    lines_found += 1
                    if hits > 0:
                        lines_hit += 1
                    else:
                        uncovered.append(line_num)

            elif line == "end_of_record" and current_file:
                pct = (lines_hit / lines_found * 100) if lines_found > 0 else 0.0
                results.append(FileCoverage(
                    file_path=current_file,
                    coverage_pct=round(pct, 2),
                    uncovered_lines=uncovered,
                    total_lines=lines_found,
                    covered_lines=lines_hit,
                ))
                current_file = None

    return results


# ---------------------------------------------------------------------------
# Ignore rules
# ---------------------------------------------------------------------------

def _should_ignore(file_path: str, patterns: list[str]) -> bool:
    name = os.path.basename(file_path)
    for pattern in patterns:
        if fnmatch.fnmatch(name, pattern) or fnmatch.fnmatch(file_path, pattern):
            return True
    return False


# ---------------------------------------------------------------------------
# Source & test file readers
# ---------------------------------------------------------------------------

def _read_file_safe(path: str) -> Optional[str]:
    """Read a file from disk, return None if not found."""
    if os.path.exists(path):
        try:
            with open(path) as f:
                return f.read()
        except Exception:
            return None
    return None


def _find_test_file(file_path: str, pattern: str, project_root: str) -> Optional[str]:
    """
    Attempt to find the test file for a given source file.
    Searches common test directories.
    """
    base = os.path.splitext(os.path.basename(file_path))[0]
    test_filename = pattern.replace("{name}", base)

    search_dirs = ["tests", "test", "__tests__", "spec", "."]
    for d in search_dirs:
        candidate = os.path.join(project_root, d, test_filename)
        if os.path.exists(candidate):
            return candidate

    # Also check alongside the source file
    source_dir = os.path.dirname(os.path.join(project_root, file_path))
    candidate = os.path.join(source_dir, test_filename)
    if os.path.exists(candidate):
        return candidate

    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class Collector:
    """
    Reads and normalizes coverage reports for a project.
    """

    def __init__(self, config: CovaiConfig, project_root: str = "."):
        self.config = config
        self.project_root = os.path.abspath(project_root)
        self.lang_cfg = config.get_language_config()

    def collect(self) -> list[FileCoverage]:
        """
        Parse the coverage report and return normalized FileCoverage objects,
        filtered by ignore rules.
        """
        coverage_path = os.path.join(self.project_root, self.lang_cfg.coverage_path)

        if not os.path.exists(coverage_path):
            raise FileNotFoundError(
                f"Coverage report not found: {coverage_path}\n"
                f"Run your test suite with coverage enabled first.\n"
                f"  Python:     pytest --cov=. --cov-report=xml\n"
                f"  TypeScript: npm test -- --coverage"
            )

        print(f"  📂 Reading: {coverage_path}")
        filtered, ignored_count = self._filter_coverages(self._parse(coverage_path))
        if ignored_count:
            print(f"  ⏭  Ignored {ignored_count} file(s) matching ignore rules")

        return filtered

    def collect_from_coverage_path(self, coverage_path: str) -> list[FileCoverage]:
        """Parse coverage from an explicit path and apply normalization + ignore rules."""
        if not os.path.exists(coverage_path):
            raise FileNotFoundError(f"Coverage report not found: {coverage_path}")
        filtered, _ = self._filter_coverages(self._parse(coverage_path))
        return filtered

    def collect_below_threshold(self) -> list[FileCoverage]:
        """Return only files below the configured coverage threshold."""
        all_files = self.collect()
        threshold = self.config.coverage.threshold
        return [f for f in all_files if f.is_below_threshold(threshold)]

    def collect_for_file(self, target_path: str) -> Optional[FileCoverage]:
        """Return coverage data for a specific file path."""
        all_files = self.collect()
        # Normalize path for comparison
        target_norm = os.path.normpath(target_path)
        for f in all_files:
            if os.path.normpath(f.file_path) == target_norm:
                return f
        return None

    def read_source(self, file_coverage: FileCoverage) -> Optional[str]:
        """Read source code for a covered file."""
        path = os.path.join(self.project_root, file_coverage.file_path)
        return _read_file_safe(path)

    def read_existing_tests(self, file_coverage: FileCoverage) -> Optional[str]:
        """Attempt to find and read existing test file."""
        test_path = _find_test_file(
            file_coverage.file_path,
            self.lang_cfg.test_file_pattern,
            self.project_root,
        )
        if test_path:
            return _read_file_safe(test_path)
        return None

    def _parse(self, coverage_path: str) -> list[FileCoverage]:
        ext = os.path.splitext(coverage_path)[1].lower()
        if ext == ".xml":
            return _parse_coverage_xml(coverage_path)
        elif ext in (".info", ".lcov"):
            return _parse_lcov(coverage_path)
        else:
            raise ValueError(
                f"Unsupported coverage format: {ext}\n"
                f"Supported: .xml (Cobertura/pytest-cov), .info/.lcov (LCOV/Jest)"
            )

    def _filter_coverages(
        self,
        coverages: list[FileCoverage],
    ) -> tuple[list[FileCoverage], int]:
        normalized = [
            FileCoverage(
                file_path=self.normalize_path(file_coverage.file_path),
                coverage_pct=file_coverage.coverage_pct,
                uncovered_lines=list(file_coverage.uncovered_lines),
                uncovered_branches=list(file_coverage.uncovered_branches),
                total_lines=file_coverage.total_lines,
                covered_lines=file_coverage.covered_lines,
            )
            for file_coverage in coverages
        ]
        ignore_patterns = self.config.rules.ignore
        filtered = [f for f in normalized if not _should_ignore(f.file_path, ignore_patterns)]
        return filtered, len(normalized) - len(filtered)

    def normalize_path(self, file_path: str) -> str:
        """Normalize a path to project-relative form when possible."""
        normalized = os.path.normpath(file_path)
        if os.path.isabs(normalized):
            try:
                relative = os.path.relpath(normalized, self.project_root)
            except ValueError:
                return normalized
            if not relative.startswith(".."):
                return os.path.normpath(relative)
        return normalized

    def summary(self, files: list[FileCoverage]) -> str:
        """Return a human-readable summary string."""
        if not files:
            return "No files to summarize."
        avg = sum(f.coverage_pct for f in files) / len(files)
        lines = [f"  {'File':<55} {'Coverage':>10}  {'Uncovered Lines'}"]
        lines.append("  " + "-" * 90)
        for f in sorted(files, key=lambda x: x.coverage_pct):
            uncov = str(f.uncovered_lines[:5])
            if len(f.uncovered_lines) > 5:
                uncov += f" ... (+{len(f.uncovered_lines) - 5} more)"
            lines.append(f"  {f.file_path:<55} {f.coverage_pct:>9.1f}%  {uncov}")
        lines.append("  " + "-" * 90)
        lines.append(f"  {'Average':<55} {avg:>9.1f}%")
        return "\n".join(lines)
