"""
covai CLI — entry point for all commands.

Commands:
  covai analyze [--file <path>]    Analyze coverage gaps (no generation)
  covai generate <file>            Generate tests for a specific file
  covai run [--file <path>]        Full flow: analyze → generate (dry-run of AI payloads)

Use --output json to get machine-readable output.
"""

import argparse
import json
import os
import sys
import threading
import time
from pathlib import Path

from covai.config import CovaiConfigError, load_config, validate_ai_config
from covai.collector import Collector
from covai.analyzer import Analyzer
from covai.agents import LLMModel


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _detect_language(config_path: str) -> str:
    """Simple heuristic: look for package.json → ts/js, else python."""
    root = os.path.dirname(os.path.abspath(config_path))
    if os.path.exists(os.path.join(root, "package.json")):
        if os.path.exists(os.path.join(root, "tsconfig.json")):
            return "typescript"
        return "javascript"
    return "python"


def _print_section(title: str):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


def _print_prompt_preview(prompt, verbose: bool = False):
    """Print a readable preview of a prepared prompt."""
    print(f"\n  📄 {prompt.file_path}")
    print(f"     Mode:      {prompt.mode}")
    print(f"     Coverage:  {prompt.payload.coverage_pct:.1f}%")
    print(f"     Uncovered: {prompt.payload.uncovered_lines[:10]}", end="")
    if len(prompt.payload.uncovered_lines) > 10:
        print(f" ... (+{len(prompt.payload.uncovered_lines) - 10} more)")
    else:
        print()
    print(f"     Has source:        {'✔' if prompt.payload.source_code else '✘'}")
    print(f"     Has existing tests:{'✔' if prompt.payload.existing_tests else '✘'}")
    if verbose:
        print(f"\n  ── System Prompt ──────────────────────────────────")
        print(prompt.system_prompt[:600] + ("..." if len(prompt.system_prompt) > 600 else ""))
        print(f"\n  ── User Prompt ────────────────────────────────────")
        print(prompt.user_prompt[:800] + ("..." if len(prompt.user_prompt) > 800 else ""))


def _run_with_progress(message: str, action):
    """Show a live progress indicator while waiting for a blocking action."""
    stop_event = threading.Event()
    start_time = time.time()

    def _spinner():
        frames = ["|", "/", "-", "\\"]
        idx = 0
        while not stop_event.is_set():
            elapsed = int(time.time() - start_time)
            frame = frames[idx % len(frames)]
            print(
                f"\r  {frame} {message} ({elapsed}s elapsed)",
                end="",
                flush=True,
            )
            idx += 1
            stop_event.wait(0.2)

    spinner_thread = threading.Thread(target=_spinner, daemon=True)
    spinner_thread.start()
    try:
        result = action()
    finally:
        stop_event.set()
        spinner_thread.join()
        print("\r" + " " * 80 + "\r", end="", flush=True)

    elapsed = time.time() - start_time
    print(f"  ✔ {message} completed in {elapsed:.1f}s")
    return result


def _add_model_argument(parser):
    parser.add_argument(
        "--model", choices=["gemini", "claude"], default=None,
        help="AI model provider to use (default: covai.yaml default_model, else gemini)"
    )


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_analyze(args, config, collector, analyzer):
    """
    covai analyze [--file <path>]
    Collects coverage and builds analysis prompts. No AI call yet.
    """
    _print_section("🔍 Coverage Analysis")

    if args.file:
        fc = collector.collect_for_file(args.file)
        if not fc:
            print(f"\n  ✘ File not found in coverage report: {args.file}")
            sys.exit(1)
        files = [fc]
    else:
        print(f"\n  Threshold: {config.coverage.threshold}%")
        files = collector.collect_below_threshold()

    if not files:
        print(f"\n  ✅ All files are above the {config.coverage.threshold}% threshold. Nothing to do.")
        return

    print(f"\n  Found {len(files)} file(s) below threshold:\n")
    print(collector.summary(files))

    _print_section("🧠 Building AI Analysis Prompts")
    prompts = analyzer.prepare_all(files)

    print(f"\n  Prepared {len(prompts)} prompt(s):\n")
    for p in prompts:
        _print_prompt_preview(p, verbose=args.verbose)

    if args.output == "json":
        out = [p.to_dict() for p in prompts]
        print("\n" + json.dumps(out, indent=2))

    _print_section("✅ Analyze complete")
    print(f"""
  Next step: pipe these prompts to your AI model.
  Each prompt contains:
    - system_prompt  → role + output format instructions
    - user_prompt    → file code, coverage data, test context

  Use `covai run` to also build generation prompts after analysis.
""")


def cmd_generate(args, config, collector, analyzer):
    """
    covai generate <file>
    Builds a generation prompt for a specific file.
    """
    _print_section(f"🎯 Generate: {args.file}")

    fc = collector.collect_for_file(args.file)
    if not fc:
        # File might not be in report — create a stub
        print(f"\n  ⚠  File not in coverage report. Creating prompt with no coverage data.")
        from covai.models import FileCoverage
        fc = FileCoverage(file_path=args.file, coverage_pct=0.0)

    print(f"\n  Coverage:        {fc.coverage_pct:.1f}%")
    print(f"  Uncovered lines: {fc.uncovered_lines[:10]}")

    ai_input = analyzer.build_analysis_input(fc)
    prompt = analyzer.build_generate_prompt(ai_input, missing_scenarios=[])

    print(f"\n  ✔ Generation prompt built for: {args.file}")
    _print_prompt_preview(prompt, verbose=args.verbose)

    if args.output == "json":
        print("\n" + json.dumps(prompt.to_dict(), indent=2))

    _print_section("✅ Generate prompt ready")
    print(f"""
  This prompt is ready to send to your AI model.
  The AI will return a complete test file covering the uncovered lines.
""")


def cmd_run(args, config, collector, analyzer):
    """
    covai run [--file <path>]
    Full pipeline: collect → analyze → build generation prompts.
    This is the complete pre-AI preparation for the feedback loop.
    """
    _print_section("🚀 covai run")

    # Step 1: Collect
    print("\n  Step 1/3 — Collecting coverage data...")
    if args.file:
        fc = collector.collect_for_file(args.file)
        files = [fc] if fc else []
    else:
        files = collector.collect_below_threshold()

    if not files:
        print(f"\n  ✅ All files meet the {config.coverage.threshold}% threshold.")
        return

    print(f"\n  {len(files)} file(s) queued for improvement:\n")
    print(collector.summary(files))

    # Step 2: Build analysis prompts
    print("\n\n  Step 2/3 — Building analysis prompts (gap identification)...")
    analyze_prompts = analyzer.prepare_all(files)
    print(f"  ✔ {len(analyze_prompts)} analysis prompt(s) ready")

    for p in analyze_prompts:
        _print_prompt_preview(p, verbose=args.verbose)

    # Step 3: Build generation prompts
    # In a real run, you'd call the AI here and use the response.
    # For now, we prepare generation prompts with empty scenario lists.
    print("\n\n  Step 3/3 — Building generation prompts...")
    generate_prompts = analyzer.prepare_generate(files)
    print(f"  ✔ {len(generate_prompts)} generation prompt(s) ready")

    for p in generate_prompts:
        _print_prompt_preview(p, verbose=args.verbose)


    if args.output == "json":
        out = {
            "analyze_prompts": [p.to_dict() for p in analyze_prompts],
            "generate_prompts": [p.to_dict() for p in generate_prompts],
        }
        print("\n" + json.dumps(out, indent=2))

    _print_section("✅ Prompt preparation complete")
    print(f"""
  Prepared:
    • {len(analyze_prompts)} analysis prompts  → send to AI to identify gaps
    • {len(generate_prompts)} generation prompts → send to AI to write tests
""")

    _print_section("🤖 Generating tests with AI")
    print(
        f"\n  Using {config.ai.selected_model} ({config.ai.model}) "
        f"for {len(generate_prompts)} file(s)."
    )

    llm_model = LLMModel.create(config.ai)

    for idx, p in enumerate(generate_prompts, start=1):
        print(f"\n  [{idx}/{len(generate_prompts)}] Preparing request for {p.file_path}")
        print("  Sending prompt to AI model and waiting for response...")
        tests = _run_with_progress(
            f"Generating tests for {p.file_path}",
            lambda prompt=p: llm_model.generate(prompt),
        )

        data_dir = Path('ai_generated_tests')
        ori_path = Path(p.file_path)
        new_file_name = f"{ori_path.stem}.test{ori_path.suffix}"

        file_path = data_dir / ori_path.with_name(new_file_name)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        file_path.write_text(tests)
        print(f"  ✔ Saved generated tests to {file_path}")

    print("\n  ✅ Test cases have been generated and stored in ai_generated_tests")
# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        prog="covai",
        description="AI-powered test coverage improvement tool",
    )
    parser.add_argument(
        "--config", default=None,
        help="Path to covai.yaml (default: ./covai.yaml)"
    )
    parser.add_argument(
        "--language", default=None,
        help="Override language detection (python, typescript, javascript)"
    )
    parser.add_argument(
        "--output", choices=["text", "json"], default="text",
        help="Output format"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Show full prompt content"
    )
    parser.add_argument(
        "--root", default=".",
        help="Project root directory (default: current directory)"
    )
    _add_model_argument(parser)

    subparsers = parser.add_subparsers(dest="command", required=True)

    # analyze
    p_analyze = subparsers.add_parser("analyze", help="Analyze coverage gaps")
    p_analyze.add_argument("--file", default=None, help="Target a specific file")
    _add_model_argument(p_analyze)

    # generate
    p_generate = subparsers.add_parser("generate", help="Generate tests for a file")
    p_generate.add_argument("file", help="Source file to generate tests for")
    _add_model_argument(p_generate)

    # run
    p_run = subparsers.add_parser("run", help="Full pipeline: analyze + generate")
    p_run.add_argument("--file", default=None, help="Target a specific file")
    _add_model_argument(p_run)

    args = parser.parse_args()

    # Load config
    try:
        config = load_config(args.config, selected_model=args.model)
        validate_ai_config(config, require_api_key=args.command == "run")
    except CovaiConfigError as exc:
        print(f"\n  ✘ Invalid AI configuration\n\n  {exc}\n")
        sys.exit(1)

    # Detect or override language
    language = args.language or _detect_language(args.config or "covai.yaml")
    config.active_language = language
    print(
        f"\n  covai | language: {language} | threshold: {config.coverage.threshold}%"
        f" | ai: {config.ai.selected_model} ({config.ai.model})"
    )

    # Build shared components
    collector = Collector(config, project_root=args.root)
    analyzer = Analyzer(config, collector)

    # Dispatch
    dispatch = {
        "analyze": cmd_analyze,
        "generate": cmd_generate,
        "run": cmd_run,
    }
    try:
        dispatch[args.command](args, config, collector, analyzer)
    except (FileNotFoundError, ValueError) as exc:
        print(f"\n  ✘ {exc}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
