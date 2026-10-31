"""Convert the supplied OTFs without changing outlines, character coverage or metadata.

Requires fonttools[woff]. Pass a directory outside public containing the seven
SourceHanSansSC-*.otf source files; only generated webfonts belong in public.
"""
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source_dir", type=Path, help="Directory containing the seven original OTF files")
args = parser.parse_args()
root = Path("public/assets/shared/fonts")
weights = {"ExtraLight": 250, "Light": 300, "Normal": 350, "Regular": 400,
           "Medium": 500, "Bold": 700, "Heavy": 900}
source_root = args.source_dir.resolve()
public_root = Path("public").resolve()
if source_root.is_relative_to(public_root):
    parser.error("Keep original OTF files outside the public directory")
missing = [name for name in weights if not (source_root / f"SourceHanSansSC-{name}.otf").is_file()]
if missing:
    parser.error("Missing source OTF weights: " + ", ".join(missing))
from fontTools.ttLib import TTFont

for name, weight in weights.items():
    source = source_root / f"SourceHanSansSC-{name}.otf"
    with TTFont(source, recalcTimestamp=False) as font:
        assert font["OS/2"].usWeightClass == weight, source
        original_cmap = font.getBestCmap()
        font.flavor = "woff2"
        target = root / f"SourceHanSansSC-{name}.woff2"
        font.save(target)
        with TTFont(target) as output:
            assert output.getBestCmap() == original_cmap, target
            assert output["OS/2"].usWeightClass == weight, target
        print(f"{source.name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes", flush=True)
