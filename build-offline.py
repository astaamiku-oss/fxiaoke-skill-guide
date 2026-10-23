from pathlib import Path
import base64
p=Path(__file__).parent
h=(p/'index.html').read_text()
h=h.replace('<link rel="stylesheet" href="style.css">','<style>'+(p/'style.css').read_text()+'</style>')
h=h.replace('<script src="app.js" type="module"></script>','').replace('<script src="prompts.js" defer></script>','')
model=(p/'demo-model.js').read_text().replace('export const','const').replace('export function','function')
a=(p/'app.js').read_text().replace("import {scenarios,nextState} from './demo-model.js';",'')
h=h.replace('</body>','<script>\n'+model+'\n'+a+'\n</script><script>\n'+(p/'prompts.js').read_text()+'\n</script></body>')
for f in (p/'downloads').glob('*.zip'):
 h=h.replace('downloads/'+f.name,'data:application/zip;base64,'+base64.b64encode(f.read_bytes()).decode())
(p/'offline.html').write_text(h)
