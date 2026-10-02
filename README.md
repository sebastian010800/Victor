# Feliz cumpleaños, Victor

Página estática (HTML + CSS + JS, sin compilación). Abre `index.html` con doble clic o publícala en GitHub Pages, Netlify, etc.

1. **Salvapantallas**: una carpeta navideña con "Feliz cumpleaños Victor" se abre y muestra las fotos. Se repite en bucle. Un clic, un toque o una tecla pasa a las cartas.
2. **Cartas**: un carrusel en este orden: Juan Camilo, Juanes, Valeria, Melan, Laura, Alejo, Fede, Sebastian y Natalia. En computador hay un menú lateral con todas las cartas (se oculta con el botón ☰) y flechas a los lados de la carta. En el celular, los nombres y las flechas van abajo, cada carta se ve completa dentro del recuadro y se puede pasar deslizando el dedo. También se navega con ← →.
   Cada carta tiene un botón **Ampliar** (o se toca la carta) que la abre en pantalla completa para leerla bien en el celular.
3. **Meraki**: la carta final, con un texto arriba y un cuadro de fotos en columnas que suben y bajan.
4. **Galería**: una diapositiva después de Meraki con todas las fotos (se amplían al tocarlas) y los videos. Se reproduce un video a la vez, y el salvapantallas no vuelve mientras un video está sonando.

Después de 3 minutos sin actividad vuelve el salvapantallas.

## Actualizar fotos y cartas

Pon todo en una carpeta (por ejemplo `D:\Escritorio\Imagenes\victor`) y corre:

```
py scripts/preparar.py "D:\Escritorio\Imagenes\victor"
```

Necesita Python con `pymupdf` y `Pillow`, y Microsoft Word para convertir los `.docx`. El script regenera `fotosVic/`, `Cartas/`, `videosVic/` y `datos.js`. No edites esos archivos a mano.

- **Cartas**: cualquier archivo cuyo nombre incluya el nombre de la persona (`Carta Victor Natalia.pdf`, `natalia.jpg`…). Acepta PDF, Word e imágenes. Los PDF y los Word se convierten a imágenes, una por página, para que se vean igual en cualquier celular.
- **Meraki**: un archivo con "Meraki" en el nombre reemplaza el texto por defecto de la última carta. Ese texto se puede editar en `CARTA_MERAKI`, al inicio de `app.js`.
- **Videos**: cualquier `.mp4`, `.webm` o `.m4v`. Si el nombre no es el automático de WhatsApp, se muestra como título (`victor bailando.mp4` → "Victor bailando"). Los `.mov` del iPhone hay que exportarlos a `.mp4`.
- **Fotos**: cualquier otra imagen.

Atajos para revisar: `index.html#cartas` entra directo a las cartas, y `index.html#cartas-11` abre la galería.
