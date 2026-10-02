"""Prepara las fotos y las cartas para la página y escribe datos.js.

Uso (desde la raíz del repo):

    py scripts/preparar.py "D:\\Escritorio\\Imagenes\\victor"

Toma todo lo que haya en la carpeta de origen (también en subcarpetas):

- Si el nombre del archivo menciona a una persona de PERSONAS (o a Meraki),
  es su carta. Los PDF y los Word se pasan a imágenes, una por página: así se
  ven con su diseño original en cualquier celular, que no siempre sabe
  mostrar un PDF dentro de una página.
- Si el nombre dice "carta" pero no a quién, se avisa y se ignora.
- Cualquier otra imagen es una foto y va a fotosVic/.
- Los videos van a videosVic/, sin importar su nombre. Si el nombre no es el
  automático de WhatsApp, se usa como título ("victor bailando.mp4").

fotosVic/, Cartas/ y videosVic/ se regeneran completas en cada corrida: no guardes nada a
mano ahí, ponlo en la carpeta de origen.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import pymupdf
from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
FOTOS = RAIZ / "fotosVic"
CARTAS = RAIZ / "Cartas"
VIDEOS = RAIZ / "videosVic"

# Orden en que se muestran las cartas. Los alias se buscan dentro del nombre
# del archivo, sin tildes, mayúsculas ni espacios.
PERSONAS = [
    ("Juan Camilo", ["juancamilo", "camilo"]),
    ("Juanes", ["juanes"]),
    ("Valeria", ["valeria"]),
    ("Melan", ["melan"]),
    ("Laura", ["laura"]),
    ("Alejo", ["alejo", "alejandro"]),
    ("Fede", ["fede", "federico"]),
    ("Sebastian", ["sebastian", "sebas"]),
    ("Natalia", ["natalia"]),
]
MERAKI = ("Meraki", ["meraki"])

EXT_IMAGEN = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
EXT_WORD = {".docx", ".doc"}
# .mov queda afuera: el iPhone los graba en HEVC, que Chrome y Android no
# reproducen. Hay que exportarlos a .mp4 primero.
EXT_VIDEO = {".mp4", ".webm", ".m4v"}

# Lado largo máximo. Con 1800px una carta se lee nítida en pantalla grande y
# una foto no pesa de más en el celular.
LADO_MAX_CARTA = 1800
LADO_MAX_FOTO = 1600


def normalizar(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s.lower() if c.isalnum() and not unicodedata.combining(c))


def slug(nombre: str) -> str:
    return normalizar(nombre) or "carta"


def persona_de(archivo: Path):
    """Primera persona cuyo alias aparece en el nombre. "juancamilo" va antes
    que "juanes" y nadie usa "juan" a secas, así que no se cruzan."""
    base = normalizar(archivo.stem)
    for nombre, alias in [*PERSONAS, MERAKI]:
        if any(a in base for a in alias):
            return nombre
    return None


def guardar_jpg(img: Image.Image, destino: Path, lado_max: int) -> dict:
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        fondo = Image.new("RGB", img.size, "white")
        fondo.paste(img, mask=img.getchannel("A") if "A" in img.getbands() else None)
        img = fondo
    img.thumbnail((lado_max, lado_max), Image.LANCZOS)
    img.save(destino, "JPEG", quality=86, optimize=True, progressive=True)
    return {"src": f"{destino.parent.name}/{destino.name}", "w": img.width, "h": img.height}


def paginas_pdf(pdf: Path):
    with pymupdf.open(pdf) as doc:
        for pagina in doc:
            # Escala para que el lado largo quede en LADO_MAX_CARTA.
            escala = LADO_MAX_CARTA / max(pagina.rect.width, pagina.rect.height)
            pix = pagina.get_pixmap(matrix=pymupdf.Matrix(escala, escala), alpha=False)
            yield Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def word_a_pdf(doc: Path, destino: Path):
    """Exporta con el Word instalado (es lo único que respeta el diseño)."""
    ps = (
        "$w = New-Object -ComObject Word.Application; $w.Visible = $false; "
        "try { $d = $w.Documents.Open($env:ORIGEN, $false, $true); "
        "$d.ExportAsFixedFormat($env:DESTINO, 17); $d.Close($false) } finally { $w.Quit() }"
    )
    subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps],
        check=True,
        env={**os.environ, "ORIGEN": str(doc), "DESTINO": str(destino)},
        capture_output=True,
    )


def main():
    if len(sys.argv) < 2:
        sys.exit('Uso: py scripts/preparar.py "<carpeta con fotos y cartas>"')
    origen = Path(sys.argv[1])
    if not origen.is_dir():
        sys.exit(f"No existe la carpeta: {origen}")

    for carpeta in (FOTOS, CARTAS, VIDEOS):
        shutil.rmtree(carpeta, ignore_errors=True)
        carpeta.mkdir()

    avisos = []
    fotos = []
    videos = []
    paginas = {}  # nombre -> [ {src, w, h} ]

    archivos = sorted(
        (p for p in origen.rglob("*") if p.is_file() and not p.name.startswith((".", "~$"))),
        key=lambda p: str(p).lower(),
    )

    with tempfile.TemporaryDirectory() as tmp:
        for archivo in archivos:
            ext = archivo.suffix.lower()

            # Los videos se revisan antes que las cartas: "fede bailando.mp4" es
            # un video, no la carta de Fede.
            if ext in EXT_VIDEO:
                destino = VIDEOS / f"video-{len(videos) + 1:02d}{ext}"
                shutil.copyfile(archivo, destino)
                titulo = "" if normalizar(archivo.stem).startswith("whatsapp") else archivo.stem.strip()
                videos.append({"src": f"{VIDEOS.name}/{destino.name}", "titulo": titulo[:1].upper() + titulo[1:]})
                continue
            if ext == ".mov":
                avisos.append(f"Los .mov no se ven en todos los navegadores; expórtalo a .mp4: {archivo.name}")
                continue

            persona = persona_de(archivo)

            if persona is None:
                if ext in EXT_IMAGEN and "carta" not in normalizar(archivo.stem):
                    destino = FOTOS / f"foto-{len(fotos) + 1:02d}.jpg"
                    with Image.open(archivo) as img:
                        fotos.append(guardar_jpg(img, destino, LADO_MAX_FOTO))
                elif ext in EXT_IMAGEN or ext in EXT_WORD or ext == ".pdf":
                    avisos.append(f"No sé de quién es esta carta, se ignora: {archivo.name}")
                else:
                    avisos.append(f"Formato no soportado, se ignora: {archivo.name}")
                continue

            lista = paginas.setdefault(persona, [])

            def agregar(img):
                destino = CARTAS / f"{slug(persona)}-{len(lista) + 1}.jpg"
                lista.append(guardar_jpg(img, destino, LADO_MAX_CARTA))

            try:
                if ext in EXT_IMAGEN:
                    with Image.open(archivo) as img:
                        agregar(img)
                elif ext == ".pdf":
                    for img in paginas_pdf(archivo):
                        agregar(img)
                elif ext in EXT_WORD:
                    pdf = Path(tmp) / f"{slug(persona)}-{len(lista)}.pdf"
                    word_a_pdf(archivo, pdf)
                    for img in paginas_pdf(pdf):
                        agregar(img)
                else:
                    avisos.append(f"Formato no soportado, se ignora: {archivo.name}")
            except Exception as err:  # una carta rota no debe tumbar las demás
                avisos.append(f"No se pudo convertir {archivo.name}: {err}")

    cartas = []
    for nombre, _ in PERSONAS:
        if paginas.get(nombre):
            cartas.append({"nombre": nombre, "paginas": paginas[nombre]})
        else:
            avisos.append(f"Falta la carta de {nombre} (no se mostrará).")

    datos = {
        "fotos": fotos,
        "videos": videos,
        "cartas": cartas,
        "meraki": {"nombre": "Meraki", "paginas": paginas.get("Meraki", [])},
    }
    (RAIZ / "datos.js").write_text(
        "// Generado por scripts/preparar.py — no editar a mano.\n"
        f"window.DATOS = {json.dumps(datos, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )

    print(f"OK datos.js: {len(fotos)} fotos, {len(videos)} videos, {len(cartas)} cartas"
          + (" + Meraki" if paginas.get("Meraki") else ""))
    for c in cartas:
        print(f"  - {c['nombre']}: {len(c['paginas'])} página(s)")
    for aviso in avisos:
        print(f"  ! {aviso}")


if __name__ == "__main__":
    main()
