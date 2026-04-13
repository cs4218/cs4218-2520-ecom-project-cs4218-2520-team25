"""
Shared data models for covai.
All layers communicate via these typed structures.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FileCoverage:
    """Normalized coverage data for a single file."""
    file_path: str
    coverage_pct: float
    uncovered_lines: list[int] = field(default_factory=list)
    uncovered_branches: list[str] = field(default_factory=list)
    total_lines: int = 0
    covered_lines: int = 0

    def is_below_threshold(self, threshold: float) -> bool:
        return self.coverage_pct < threshold

    def __repr__(self):
        return f"FileCoverage({self.file_path}, {self.coverage_pct:.1f}%)"


@dataclass
class AIAnalysisInput:
    """
    Structured input sent to the AI analysis layer.
    This is the payload for the 'analyze' step.
    """
    file_path: str
    coverage_pct: float
    uncovered_lines: list[int]
    source_code: Optional[str]
    existing_tests: Optional[str]
    test_framework: str
    language: str

    def to_dict(self) -> dict:
        return {
            "file_path": self.file_path,
            "coverage": self.coverage_pct,
            "uncovered_lines": self.uncovered_lines,
            "code": self.source_code or "(not found)",
            "existing_tests": self.existing_tests or "(none found)",
            "test_framework": self.test_framework,
            "language": self.language,
        }


@dataclass
class AnalysisPrompt:
    """
    The fully structured prompt ready to be sent to an AI model.
    Contains both the raw payload and the rendered prompt string.
    """
    file_path: str
    mode: str  # "analyze" or "generate"
    payload: AIAnalysisInput
    system_prompt: str
    user_prompt: str

    def to_dict(self) -> dict:
        return {
            "file_path": self.file_path,
            "mode": self.mode,
            "payload": self.payload.to_dict(),
            "system_prompt": self.system_prompt,
            "user_prompt": self.user_prompt,
        }
