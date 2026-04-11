"""
Config loader for covai.yaml
Supports defaults so minimal config files still work.
"""

from enum import Enum
import os
import yaml
from dataclasses import dataclass, field
from typing import Optional


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
        "default_model": "gemini",
        "max_iterations": 3,
        "max_tokens": 4096,
        "models": {
            "gemini": {
                "model": "gemini-3-flash-preview",
                "api_key": "",
            },
            "claude": {
                "model": "claude-sonnet-4-20250514",
                "api_key": "",
            },
        },
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


class SupportedClients(Enum):
    GOOGLE = 1
    CLAUDE = 2


class ModelNames(Enum):
    GEM_3_FLASH = "gemini-3-flash-preview"
    CLAUDE_SONNET_4 = "claude-sonnet-4-20250514"


class CovaiConfigError(ValueError):
    """Raised when covai.yaml is missing required or valid configuration."""


@dataclass
class AIModelConfig:
    model: str
    api_key: Optional[str] = None


@dataclass
class AIConfig:
    default_model: str = "gemini"
    selected_model: str = "gemini"
    client: SupportedClients = SupportedClients.GOOGLE
    model: str = ModelNames.GEM_3_FLASH.value
    max_iterations: int = 3
    max_tokens: int = 4096
    api_key: Optional[str] = None
    models: dict[str, AIModelConfig] = field(default_factory=dict)


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


SUPPORTED_MODEL_CLIENTS = {
    "gemini": SupportedClients.GOOGLE,
    "claude": SupportedClients.CLAUDE,
}

DEFAULT_PROVIDER_MODELS = {
    "gemini": ModelNames.GEM_3_FLASH.value,
    "claude": ModelNames.CLAUDE_SONNET_4.value,
}


def _deep_merge(base: dict, override: dict) -> dict:
    """Merge override into base recursively."""
    result = dict(base)
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = _deep_merge(result[key], val)
        else:
            result[key] = val
    return result


def _normalize_model_name(model_name: Optional[str]) -> str:
    normalized = (model_name or "").strip().lower()
    if normalized not in SUPPORTED_MODEL_CLIENTS:
        raise CovaiConfigError(
            "Unsupported AI model selection "
            f"'{model_name}'. Supported values: gemini, claude."
        )
    return normalized


def _infer_model_name(model_value: Optional[str]) -> str:
    model_value = (model_value or "").strip().lower()
    if model_value.startswith("claude"):
        return "claude"
    return "gemini"


def _parse_ai_config(ai_raw: dict, selected_model: Optional[str]) -> AIConfig:
    raw_models = dict(ai_raw.get("models", {}) or {})

    legacy_model = ai_raw.get("model")
    legacy_api_key = ai_raw.get("api_key")
    configured_default = ai_raw.get("default_model")

    if legacy_model and not configured_default:
        configured_default = _infer_model_name(legacy_model)

    if legacy_model:
        legacy_model_name = _infer_model_name(legacy_model)
        provider_config = dict(raw_models.get(legacy_model_name, {}) or {})
        provider_config.setdefault("model", legacy_model)
        if legacy_api_key and "api_key" not in provider_config:
            provider_config["api_key"] = legacy_api_key
        raw_models[legacy_model_name] = provider_config

    default_model = _normalize_model_name(configured_default or "gemini")
    resolved_model = _normalize_model_name(selected_model or default_model)

    model_configs = {}
    for provider_name, client in SUPPORTED_MODEL_CLIENTS.items():
        provider_raw = dict(raw_models.get(provider_name, {}) or {})
        model_configs[provider_name] = AIModelConfig(
            model=provider_raw.get("model", DEFAULT_PROVIDER_MODELS[provider_name]),
            api_key=(provider_raw.get("api_key") or None),
        )

    resolved_provider = model_configs[resolved_model]
    return AIConfig(
        default_model=default_model,
        selected_model=resolved_model,
        client=SUPPORTED_MODEL_CLIENTS[resolved_model],
        model=resolved_provider.model,
        max_iterations=ai_raw.get("max_iterations", 3),
        max_tokens=ai_raw.get("max_tokens", 4096),
        api_key=resolved_provider.api_key,
        models=model_configs,
    )


def validate_ai_config(config: CovaiConfig, require_api_key: bool = False) -> None:
    ai_config = config.ai
    if ai_config.selected_model not in SUPPORTED_MODEL_CLIENTS:
        raise CovaiConfigError(
            "covai.yaml has an invalid AI model selection. "
            "Supported values are 'gemini' and 'claude'."
        )

    if require_api_key and not ai_config.api_key:
        raise CovaiConfigError(
            "covai.yaml is missing the API key for the selected AI model.\n"
            f"Selected model: {ai_config.selected_model}\n"
            f"Expected key path: ai.models.{ai_config.selected_model}.api_key"
        )


def load_config(
    config_path: Optional[str] = None,
    selected_model: Optional[str] = None,
) -> CovaiConfig:
    """
    Load covai.yaml from the given path or auto-detect in cwd.
    Falls back to defaults if file not found.
    """
    if config_path is None:
        config_path = os.path.join(os.getcwd(), "covai.yaml")

    raw = dict(DEFAULT_CONFIG)

    if os.path.exists(config_path):
        try:
            with open(config_path) as f:
                user_config = yaml.safe_load(f) or {}
        except yaml.YAMLError as exc:
            raise CovaiConfigError(f"Failed to parse {config_path}: {exc}") from exc
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
    ai_cfg = _parse_ai_config(ai_raw, selected_model)

    # Parse rules
    rules_raw = raw.get("rules", {})
    rules_cfg = RulesConfig(ignore=rules_raw.get("ignore", []))

    return CovaiConfig(
        coverage=cov_cfg,
        languages=lang_cfgs,
        ai=ai_cfg,
        rules=rules_cfg,
    )
