"""
Config loader for covai.yaml
Supports defaults so minimal config files still work.
"""

import os
import yaml
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


DEFAULT_CONFIG = {
    "coverage": {
        "threshold": 80,
    },
    "languages": {
        "python": {
            "test_runner": "pytest",
            "coverage_path": "coverage.xml",
            "test_framework": "pytest",
            "source_extensions": [".py"],
            "test_file_pattern": "test_{name}.py",
        },
        "typescript": {
            "test_runner": "npm test",
            "coverage_path": "coverage/lcov.info",
            "test_framework": "jest",
            "source_extensions": [".ts", ".tsx"],
            "test_file_pattern": "{name}.test.ts",
        },
        "javascript": {
            "test_runner": "npm test",
            "coverage_path": "coverage/lcov.info",
            "test_framework": "jest",
            "source_extensions": [".js", ".jsx"],
            "test_file_pattern": "{name}.test.js",
        },
    },
    "ai": {
        "model": "gemini-3-flash-preview",
        "max_iterations": 3,
        "max_tokens": 4096,
        "api_key": f"{os.getenv('API_KEY')}"
    },
    "rules": {
        "ignore": [
            "*.dto.py",
            "*.config.py",
            "*/__init__.py",
            "*/migrations/*",
        ]
    },
}


@dataclass
class CoverageConfig:
    threshold: float = 80.0


@dataclass
class LanguageConfig:
    test_runner: str = "pytest"
    coverage_path: str = "coverage.xml"
    test_framework: str = "pytest"
    source_extensions: list[str] = field(default_factory=lambda: [".py"])
    test_file_pattern: str = "test_{name}.py"


@dataclass
class AIConfig:
    model: str = "gemini-3-flash-preview"
    max_iterations: int = 3
    max_tokens: int = 4096         
    api_key: str = os.getenv("API_KEY")


@dataclass
class RulesConfig:
    ignore: list[str] = field(default_factory=list)


@dataclass
class CovaiConfig:
    coverage: CoverageConfig
    languages: dict[str, LanguageConfig]
    ai: AIConfig
    rules: RulesConfig
    active_language: str = "python"  # detected or set by user

    def get_language_config(self) -> LanguageConfig:
        return self.languages.get(self.active_language, LanguageConfig())


def _deep_merge(base: dict, override: dict) -> dict:
    """Merge override into base recursively."""
    result = dict(base)
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = _deep_merge(result[key], val)
        else:
            result[key] = val
    return result


def load_config(config_path: Optional[str] = None) -> CovaiConfig:
    """
    Load covai.yaml from the given path or auto-detect in cwd.
    Falls back to defaults if file not found.
    """
    if config_path is None:
        config_path = os.path.join(os.getcwd(), "covai.yaml")

    raw = dict(DEFAULT_CONFIG)

    if os.path.exists(config_path):
        with open(config_path) as f:
            user_config = yaml.safe_load(f) or {}
        raw = _deep_merge(raw, user_config)
    else:
        print(f"  [config] No covai.yaml found at {config_path}, using defaults.")

    # Parse coverage
    cov_cfg = CoverageConfig(threshold=raw["coverage"].get("threshold", 80))

    # Parse languages
    lang_cfgs = {}
    for lang, lang_raw in raw.get("languages", {}).items():
        lang_cfgs[lang] = LanguageConfig(
            test_runner=lang_raw.get("test_runner", "pytest"),
            coverage_path=lang_raw.get("coverage_path", "coverage.xml"),
            test_framework=lang_raw.get("test_framework", "pytest"),
            source_extensions=lang_raw.get("source_extensions", [".py"]),
            test_file_pattern=lang_raw.get("test_file_pattern", "test_{name}.py"),
        )

    # Parse AI
    ai_raw = raw.get("ai", {})
    ai_cfg = AIConfig(
        model=ai_raw.get("model", "claude-3-5-sonnet-20241022"),
        max_iterations=ai_raw.get("max_iterations", 3),
        max_tokens=ai_raw.get("max_tokens", 4096),
    )

    # Parse rules
    rules_raw = raw.get("rules", {})
    rules_cfg = RulesConfig(ignore=rules_raw.get("ignore", []))

    return CovaiConfig(
        coverage=cov_cfg,
        languages=lang_cfgs,
        ai=ai_cfg,
        rules=rules_cfg,
    )
