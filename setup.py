from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="deribit-volatility-filter",
    version="1.0.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Real-time volatility filter for Deribit BTC-PERPETUAL using AR(1) process",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/deribit-volatility-filter",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Financial and Insurance Industry",
        "Topic :: Office/Business :: Financial :: Investment",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "websocket-client>=1.6.0",
        "websockets>=11.0",
        "pandas>=2.0.0",
        "numpy>=1.24.0",
        "statsmodels>=0.14.0",
        "scipy>=1.10.0",
        "scikit-learn>=1.3.0",
        "requests>=2.31.0",
        "aiohttp>=3.8.0",
    ],
    entry_points={
        "console_scripts": [
            "volatility-filter=volatility_filter.filter:main",
        ],
    },
)