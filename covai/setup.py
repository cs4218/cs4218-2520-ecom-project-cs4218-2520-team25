from setuptools import setup, find_packages

setup(
    name="covai",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "pyyaml>=6.0",
    ],
    entry_points={
        "console_scripts": [
            "covai=covai.cli:main",
        ],
    },
    python_requires=">=3.10",
)
