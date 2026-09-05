"""Comprueba referencias locales, anclas y estructura del Informe 1 sin red."""
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def anchors(text):
    found = set(re.findall(r'<a\s+id=["\']([^"\']+)["\']', text))
    counts = {}
    for title in re.findall(r'^#{1,6}\s+(.+?)\s*#*$', text, re.M):
        title = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', title)
        slug = re.sub(r'[^\w\- ]', '', title.lower()).replace(' ', '-')
        count = counts.get(slug, 0)
        counts[slug] = count + 1
        found.add(slug + (f'-{count}' if count else ''))
    return found


def validate():
    paths = [ROOT/'README.md', *sorted((ROOT/'docs').glob('*.md'))]
    paths += [ROOT/name/'README.md' for name in ('App','PCB','Web','supabase','Comercializacion de Tecnologias')]
    errors = []
    count = 0
    for path in paths:
        text = path.read_text(encoding='utf-8')
        # Quitar bloques de código para no interpretar ejemplos como enlaces.
        prose = re.sub(r'```.*?```', '', text, flags=re.S)
        for match in re.finditer(r'\]\((<[^>]+>|[^)\n]+)\)', prose):
            url = match.group(1).strip().strip('<>')
            if re.match(r'^[a-zA-Z][\w+.-]*:', url):
                continue
            location, _, fragment = unquote(url).partition('#')
            target = (path.parent/location).resolve() if location else path
            count += 1
            if not target.exists():
                errors.append(f'{path.relative_to(ROOT)}: archivo ausente: {url}')
                continue
            if target.is_dir():
                target = target/'README.md'
            if fragment and target.is_file() and target.suffix.lower()=='.md' and 'historico' not in target.parts:
                if fragment not in anchors(target.read_text(encoding='utf-8')):
                    errors.append(f'{path.relative_to(ROOT)}: ancla ausente: {url}')
    report = (ROOT/'docs/INFORME 1 .docx.md').read_text(encoding='utf-8')
    diagrams = re.findall(r'```mermaid\n(.*?)```', report, re.S)
    if len(diagrams)!=11:
        errors.append(f'Informe: se esperaban 11 diagramas, hay {len(diagrams)}')
    for number, diagram in enumerate(diagrams,1):
        if not diagram.startswith(('flowchart ', 'stateDiagram-v2')):
            errors.append(f'Figura {number}: tipo de diagrama no reconocido')
        for left,right in (('[',']'),('{','}')):
            if diagram.count(left)!=diagram.count(right):
                errors.append(f'Figura {number}: delimitadores {left}{right} desbalanceados')
    if 'data:image' in report or '#bookmark=' in report:
        errors.append('Informe: restos de exportación Word/base64')
    if len(re.findall(r'^```',report,re.M))%2:
        errors.append('Informe: bloque de código sin cerrar')
    for error in errors:
        print(error)
    print(f'{len(paths)} documentos; {count} enlaces locales; {len(diagrams)} diagramas Mermaid; {len(errors)} errores.')
    return not errors


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(0 if validate() else 1)
