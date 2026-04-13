"""
Layer 2: Analyzer
Builds structured AI inputs and renders prompt templates.
This layer does NOT call the AI — it prepares everything for the AI call.

Output: AnalysisPrompt objects ready to be sent to any LLM.
"""

from covai.models import FileCoverage, AIAnalysisInput, AnalysisPrompt
from covai.config import CovaiConfig
from covai.collector import Collector


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

ANALYZE_SYSTEM_PROMPT = """\
You are a senior software engineer and test quality expert.
Your job is to analyze code coverage gaps and identify what meaningful tests are missing.

You must respond with valid JSON only — no markdown, no explanation outside the JSON.

Output format:
{{
  "priority": "high" | "medium" | "low",
  "reasoning": "1-2 sentence explanation",
  "missing_scenarios": [
    "description of missing test scenario 1",
    "description of missing test scenario 2"
  ],
  "suggested_test_types": ["unit", "integration", "edge_case"],
  "worth_testing": true | false,
  "skip_reason": "only present if worth_testing is false"
}}

Priority guide:
- high: critical business logic, error paths, security-relevant code
- medium: utility functions, transformations, standard paths
- low: trivial getters, config loading, boilerplate
"""

ANALYZE_USER_PROMPT = """\
Analyze the following file for missing test coverage.

## File Information
- Path: {file_path}
- Language: {language}
- Test Framework: {test_framework}
- Current Coverage: {coverage_pct:.1f}%
- Uncovered Lines: {uncovered_lines}

## Source Code
```{language}
{source_code}
```

## Existing Tests
```{language}
{existing_tests}
```

Identify what meaningful test scenarios are missing based on the uncovered lines above.
Focus on actual behavior gaps, not just coverage numbers.
"""

GENERATE_SYSTEM_PROMPT = """\
You are a test generation engine.
Your job is to write high-quality, meaningful tests that improve code coverage.

Rules:
- Use {test_framework}
- Match the style and conventions of the existing tests
- Only test uncovered branches and scenarios listed
- Every test must have meaningful assertions (no `assert True` or dummy tests)
- Use descriptive test names that explain what is being tested
- Handle setup and teardown properly
- Do NOT include any explanation — output the test file content only

## Import Path Rules (VERY IMPORTANT)
- The generated test file will be placed under: <project_root>/ai-generated-tests/
- The original source files remain in their original locations

- You MUST adjust all import paths relative to the new test location

### Path Transformation Rule:
If original test path is:
<project_root>/X/Y/test_file

Then generated test path will be:
<project_root>/ai-generated-tests/X/Y/test_file

Therefore, all imports must go UP from ai-generated-tests before resolving actual modules.

### Example:
Original:
import productController from "../../controller/productController";

Generated (correct):
import productController from "../../../controller/productController";

- Always compute relative paths correctly
- Never assume absolute imports unless already used in existing tests
- Prefer mirroring the existing test import style, but FIX the relative depth

Output: A complete, runnable test file. Raw code only, no markdown fences.
"""

GENERATE_USER_PROMPT = """\
Generate tests to improve coverage for the following file.

## Target File
- Path: {file_path}
- Language: {language}
- Test Framework: {test_framework}
- Current Coverage: {coverage_pct:.1f}%
- Uncovered Lines: {uncovered_lines}

## Source Code
```{language}
{source_code}
```

## Existing Tests (do not duplicate these)
```{language}
{existing_tests}
```

## Missing Scenarios to Cover
{missing_scenarios}

## Generated Test Location
The generated test file will be located at:
<project_root>/ai-generated-tests/{file_path}

Ensure all imports are correct relative to this location.

Write tests that cover the scenarios above. Output a complete test file only.
"""


# ---------------------------------------------------------------------------
# Analyzer
# ---------------------------------------------------------------------------

class Analyzer:
    """
    Builds structured AI inputs and renders prompt templates for each file.
    """

    def __init__(self, config: CovaiConfig, collector: Collector):
        self.config = config
        self.collector = collector
        self.lang_cfg = config.get_language_config()

    def build_analysis_input(self, file_coverage: FileCoverage) -> AIAnalysisInput:
        """Read source + existing tests and build the structured payload."""
        source_code = self.collector.read_source(file_coverage)
        existing_tests = self.collector.read_existing_tests(file_coverage)

        return AIAnalysisInput(
            file_path=file_coverage.file_path,
            coverage_pct=file_coverage.coverage_pct,
            uncovered_lines=file_coverage.uncovered_lines,
            source_code=source_code,
            existing_tests=existing_tests,
            test_framework=self.lang_cfg.test_framework,
            language=self.config.active_language,
        )

    def build_analyze_prompt(self, ai_input: AIAnalysisInput) -> AnalysisPrompt:
        """Render the analysis prompt (gap identification, no code generation)."""
        user_prompt = ANALYZE_USER_PROMPT.format(
            file_path=ai_input.file_path,
            language=ai_input.language,
            test_framework=ai_input.test_framework,
            coverage_pct=ai_input.coverage_pct,
            uncovered_lines=ai_input.uncovered_lines,
            source_code=ai_input.source_code or "(source not found)",
            existing_tests=ai_input.existing_tests or "(no existing tests)",
        )

        return AnalysisPrompt(
            file_path=ai_input.file_path,
            mode="analyze",
            payload=ai_input,
            system_prompt=ANALYZE_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )

    def build_generate_prompt(
        self,
        ai_input: AIAnalysisInput,
        missing_scenarios: list[str],
    ) -> AnalysisPrompt:
        """Render the test generation prompt."""
        scenarios_text = "\n".join(f"- {s}" for s in missing_scenarios)

        system_prompt = GENERATE_SYSTEM_PROMPT.format(
            test_framework=self.lang_cfg.test_framework,
        )

        user_prompt = GENERATE_USER_PROMPT.format(
            file_path=ai_input.file_path,
            language=ai_input.language,
            test_framework=ai_input.test_framework,
            coverage_pct=ai_input.coverage_pct,
            uncovered_lines=ai_input.uncovered_lines,
            source_code=ai_input.source_code or "(source not found)",
            existing_tests=ai_input.existing_tests or "(no existing tests)",
            missing_scenarios=scenarios_text,
        )

        return AnalysisPrompt(
            file_path=ai_input.file_path,
            mode="generate",
            payload=ai_input,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

    def prepare_all(self, files: list[FileCoverage]) -> list[AnalysisPrompt]:
        """
        Build analysis prompts for a list of files.
        Used by `covai analyze` — produces analyze-mode prompts only.
        """
        prompts = []
        for fc in files:
            ai_input = self.build_analysis_input(fc)
            prompt = self.build_analyze_prompt(ai_input)
            prompts.append(prompt)
        return prompts

    def prepare_generate(
        self,
        files: list[FileCoverage],
        missing_scenarios_map: dict[str, list[str]] | None = None,
    ) -> list[AnalysisPrompt]:
        """
        Build generation prompts for a list of files.
        missing_scenarios_map: file_path -> list of scenario strings from analysis step.
        If not provided, uses empty scenario list (AI will infer from uncovered lines).
        """
        prompts = []
        for fc in files:
            ai_input = self.build_analysis_input(fc)
            scenarios = (missing_scenarios_map or {}).get(fc.file_path, [])
            prompt = self.build_generate_prompt(ai_input, scenarios)
            prompts.append(prompt)
        return prompts
