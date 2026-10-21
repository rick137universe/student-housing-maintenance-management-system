"""Convert the supplied OTFs without changing outlines, character coverage or metadata.

Requires fonttools[woff]. Run from the repository root after placing the source
SourceHanSansSC-*.otf files in public/assets/fonts.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path("public/assets/fonts")
weights = {"ExtraLight": 250, "Light": 300, "Normal": 350, "Regular": 400,
           "Medium": 500, "Bold": 700, "Heavy": 900}
for name, weight in weights.items():
    source = root / f"SourceHanSansSC-{name}.otf"
    with TTFont(source, recalcTimestamp=False) as font:
        assert font["OS/2"].usWeightClass == weight, source
        original_cmap = font.getBestCmap()
        font.flavor = "woff2"
        target = source.with_suffix(".woff2")
        font.save(target)
        with TTFont(target) as output:
            assert output.getBestCmap() == original_cmap, target
            assert output["OS/2"].usWeightClass == weight, target
        print(f"{source.name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes", flush=True)
        if name == "Regular":
            notices = [font["name"].getDebugName(i) for i in [0, 7, 13, 14]]
            (root / "SourceHanSansSC-LICENSE.txt").write_text(
                "Source Han Sans SC\n\n" + "\n\n".join(n for n in notices if n) + "\n",
                encoding="utf-8")
