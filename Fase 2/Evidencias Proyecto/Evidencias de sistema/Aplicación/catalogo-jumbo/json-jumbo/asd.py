import json
from collections import defaultdict

# Cargar archivo JSON
with open('despensa.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Almacenar productos por título+link
productos_vistos = defaultdict(list)

for i, item in enumerate(data):
    clave = (item.get("title"), item.get("link"))
    productos_vistos[clave].append(i + 1)  # Guardamos la línea o índice del producto

# Mostrar productos repetidos
print("Productos duplicados:")
duplicados = False
for clave, indices in productos_vistos.items():
    if len(indices) > 1:
        duplicados = True
        print(f'🔁 Producto repetido "{clave[0]}" en líneas: {indices}')

if not duplicados:
    print("✅ No hay productos duplicados por título + link.")
