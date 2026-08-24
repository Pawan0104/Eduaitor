"""Legacy helper — prefer: node scripts/generateSplashAssets.mjs

Regenerates Android + public splash from resources/splash-source.png
(full artwork: header clouds, Learn/Innovate/Teach logo, footer scene).
School name text is removed by the Node script.
"""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "generateSplashAssets.mjs"


def main() -> None:
    subprocess.check_call(["node", str(SCRIPT)], cwd=str(ROOT))


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError:
        print("Node.js is required to generate splash assets.", file=sys.stderr)
        sys.exit(1)
