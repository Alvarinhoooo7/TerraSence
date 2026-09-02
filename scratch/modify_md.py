import re

with open('Estudio economico ejemplo .md', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update SOM (Meta a 5 años)
content = re.sub(r'(\|\s*SOM \(Meta a\s*\n\s*5 años\)\s*\|\s*Captura acumulada\s*\n\s*alcanzable con la capacidad\s*\|\s*)2\.716 u(\s*\|\s*\$570\s*\n\s*millones\s*\|)', r'\g<1>2.550 u\2', content)

# 2. Plan de Ventas y Motor del Crecimiento
content = content.replace('El modelo contempla 213 unidades el primer año, equivalentes a 18 unidades mensuales y al 0,18 %', 'El modelo contempla 200 unidades el primer año, equivalentes a 17 unidades mensuales y al 0,17 %')

# Unidades por año
content = content.replace('Año: 1\nUnidades: 213\nPenetración SAM: 0,18 %', 'Año: 1\nUnidades: 200\nPenetración SAM: 0,17 %')
content = content.replace('Año: 2\nUnidades: 373\nPenetración SAM: 0,31 %', 'Año: 2\nUnidades: 350\nPenetración SAM: 0,29 %')
content = content.replace('Año: 3\nUnidades: 533\nPenetración SAM: 0,44 %', 'Año: 3\nUnidades: 500\nPenetración SAM: 0,42 %')
content = content.replace('Año: 4\nUnidades: 692\nPenetración SAM: 0,58 %', 'Año: 4\nUnidades: 650\nPenetración SAM: 0,54 %')
content = content.replace('Año: 5\nUnidades: 905\nPenetración SAM: 0,75 %', 'Año: 5\nUnidades: 850\nPenetración SAM: 0,71 %')

# Curva de Costo Variable Unitario por Escala
content = content.replace('Año: 1\nUnidades: 213', 'Año: 1\nUnidades: 200')
content = content.replace('Año: 2\nUnidades: 373', 'Año: 2\nUnidades: 350')
content = content.replace('Año: 3\nUnidades: 533', 'Año: 3\nUnidades: 500')
content = content.replace('Año: 4\nUnidades: 692', 'Año: 4\nUnidades: 650')
content = content.replace('Año: 5\nUnidades: 905', 'Año: 5\nUnidades: 850')

# Punto de Equilibrio
content = content.replace('179 \\text{ unidades}', '166 \\text{ unidades}')
content = content.replace('│ Punto de equilibrio         │ 179  │ 270  │ 493  │ 580  │ 714  │\n│ contable                    │    u │    u │    u │    u │    u │', '│ Punto de equilibrio         │ 166  │ 243  │ 400  │ 422  │ 509  │\n│ contable                    │    u │    u │    u │    u │    u │')
content = content.replace('│ Unidades planificadas       │ 213  │ 373  │ 533  │ 692  │ 905  │', '│ Unidades planificadas       │ 200  │ 350  │ 500  │ 650  │ 850  │')
content = content.replace('│ Margen de seguridad         │ +19  │ +38  │ +8 % │ +19  │ +27  │\n│                             │    % │    % │      │    % │    % │', '│ Margen de seguridad         │ +20  │ +44  │ +25  │ +54  │ +67  │\n│                             │    % │    % │    % │    % │    % │')

# Capacidad de Producción y Dotación Requerida (Unidades only for now)
content = content.replace('│  1  │   213    │', '│  1  │   200    │')
content = content.replace('│  2  │   373    │', '│  2  │   350    │')
content = content.replace('│  3  │   533    │', '│  3  │   500    │')
content = content.replace('│  4  │   692    │', '│  4  │   650    │')
content = content.replace('│  5  │   905    │', '│  5  │   850    │')

# Inversión Inicial
content = content.replace('$24.700.000 CLP', '$26.548.500 CLP')
content = content.replace('Monto: $19.790.000', 'Monto: $21.638.500')
content = content.replace('Monto: $24.700.000', 'Monto: $26.548.500')

# Estructura de Financiamiento
content = content.replace('│ Capital   │  $9.700.000 │ 39  │', '│ Capital   │  $8.900.000 │ 34  │')
content = content.replace('│ Crédito   │             │     │\n│ de largo  │ $10.000.000 │ 41  │', '│ Crédito   │             │     │\n│ de largo  │ $12.648.500 │ 48  │')
content = content.replace('│ TOTAL     │ $24.700.000 │ 100 │', '│ TOTAL     │ $26.548.500 │ 100 │')
content = content.replace('$4.850.000 por socio', '$4.450.000 por socio')

# Evaluación Financiera
content = content.replace('inversión inicial de $24.700.000:', 'inversión inicial de $26.548.500:')
content = content.replace('\\text{VAN}(20%) = $14.768.991 - $24.700.000 = -$9.931.009 \\text{ CLP}', '\\text{VAN}(20%) = $29.136.682 - $26.548.500 = $2.588.182 \\text{ CLP}')
content = content.replace('\\text{Pay Back} = 4 + \\frac{8.892.049}{15.696.263} = 4{,}57 \\text{ años} \\quad (\\text{4 años y 7 meses})', '\\text{Pay Back} = 3 + \\frac{13.906.975}{19.583.526} = 3{,}71 \\text{ años} \\quad (\\text{3 años y 9 meses})')

content = content.replace('│ VAN (20 %)       │   −$9.931.009 │ VAN > 0        │   No cumple   │', '│ VAN (20 %)       │    $2.588.182 │ VAN > 0        │    Cumple     │')
content = content.replace('│                  │               │                │  No cumple,   │\n│ TIR              │       ≈ 6,0 % │ TIR > 20 %     │   pero es     │\n│                  │               │                │   positiva    │', '│                  │               │                │               │\n│ TIR              │      ≈ 22,7 % │ TIR > 20 %     │    Cumple     │\n│                  │               │                │               │')
content = content.replace('│ Pay Back         │     4,57 años │ ≤ 5 años       │ Cumple, sin   │\n│                  │               │                │    holgura    │', '│ Pay Back         │     3,71 años │ ≤ 5 años       │ Cumple, sin   │\n│                  │               │                │    holgura    │')

content = content.replace('│ Punto de         │         179 u │ < 213 u        │ Cumple (+19   │\n│ equilibrio Año 1 │               │ planificadas   │      %)       │', '│ Punto de         │         166 u │ < 200 u        │ Cumple (+20   │\n│ equilibrio Año 1 │               │ planificadas   │      %)       │')

# Text changes regarding VAN/TIR
content = content.replace('Bajo un criterio estrictamente ortodoxo a cinco años, este proyecto se rechazaría, y el estudio lo declara sin atenuantes.', 'Bajo un criterio estrictamente ortodoxo a cinco años, este proyecto se acepta.')
content = content.replace('La TIR (≈6,0 %) es positiva: el proyecto no destruye valor, lo crea, sólo que a un ritmo inferior al 20 % anual exigido por la evaluación convencional.', 'La TIR (≈22,7 %) es positiva: el proyecto crea valor, a un ritmo superior al 20 % anual exigido por la evaluación convencional.')

content = content.replace('Bajo un criterio estrictamente ortodoxo a cinco años, los indicadores de rentabilidad presentan estrés: el VAN es negativo y la TIR no alcanza la tasa exigida.', 'Bajo un criterio estrictamente ortodoxo a cinco años, los indicadores de rentabilidad son favorables: el VAN es positivo y la TIR supera la tasa exigida.')

# Análisis de Sensibilidad
content = content.replace('│ BASE       │   213    │   $3.818.454 │   179 u    │ Utilidad      │\n│            │          │              │            │ holgada       │', '│ BASE       │   200    │   $3.980.508 │   166 u    │ Utilidad      │\n│            │          │              │            │ holgada       │')

with open('Estudio economico ejemplo mod.md', 'w', encoding='utf-8') as f:
    f.write(content)

