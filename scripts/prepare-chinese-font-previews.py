"""Build small GB2312/UI subsets; the complete fonts remain the rare-glyph fallback."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path('public/assets/fonts')
characters = set()
for high in range(0xA1, 0xF8):
    for low in range(0xA1, 0xFF):
        try:
            characters.update(bytes([high, low]).decode('gb2312'))
        except UnicodeDecodeError:
            pass
for pattern in ('**/*.ts', '**/*.tsx'):
    for path in Path('src').glob(pattern):
        characters.update(path.read_text(encoding='utf-8'))
characters = {ord(c) for c in characters if 0x2E80 <= ord(c) <= 0xFFEF}
weights = {'ExtraLight':250, 'Light':300, 'Normal':350, 'Regular':400,
           'Medium':500, 'Bold':700, 'Heavy':900}
rules = []
for name, weight in weights.items():
    with TTFont(root / f'SourceHanSansSC-{name}.woff2', recalcTimestamp=False) as font:
        expected = characters.intersection(font.getBestCmap())
        options = subset.Options()
        options.flavor = 'woff2'
        options.recalc_timestamp = False
        worker = subset.Subsetter(options=options)
        worker.populate(unicodes=expected)
        worker.subset(font)
        target = root / f'SourceHanSansSC-UI-{name}.woff2'
        font.save(target)
    with TTFont(target) as output:
        assert expected.issubset(output.getBestCmap())
        assert output['OS/2'].usWeightClass == weight
    rules.append(f'''@font-face {{
  font-family: SourceHanSansSC-UI;
  src: url("/assets/fonts/{target.name}") format("woff2");
  font-weight: {weight};
  font-style: normal;
  font-display: block;
  unicode-range: U+2E80-FFFF, U+20000-323AF;
}}''')
    print(f'{name}: {target.stat().st_size:,} bytes', flush=True)
(root / 'source-han-sans-sc-ui.css').write_text('\n'.join(rules)+'\n', encoding='utf-8')
