(() => {
  "use strict";

  /** Texto de la carta final. Si en la carpeta de origen hay un archivo con
   * "Meraki" en el nombre, se muestra ese en lugar de este texto. */
  const CARTA_MERAKI = {
    pre: "Con cariño, de parte de todos",
    titulo: "Meraki",
    parrafos: [
      "Victor, gracias por ser parte de esta familia. Por tu entrega, tu alegría y la forma en que cuidas a cada uno de nosotros.",
      "Que este nuevo año venga lleno de bendiciones, salud y muchos momentos más para compartir juntos. ¡Te queremos mucho!",
    ],
    firma: "¡Feliz cumpleaños!",
  };

  /** Duración de una pasada completa del salvapantallas. */
  const PASADA_MS = 15000;
  /** Momentos de cada acto, en fracción de la pasada (como en el photobooth). */
  const ACTO = { cursor: 0.16, abrir: 0.25, fotos: 0.29, cierre: 0.8 };
  const MAX_FOTOS_PILA = 8;
  /** Sin ninguna actividad (mouse, toque, tecla, scroll ni video sonando)
   * durante este tiempo, vuelve el salvapantallas. */
  const INACTIVIDAD_MS = 3 * 60 * 1000;

  const DATOS = window.DATOS || { fotos: [], cartas: [], meraki: null };
  const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel) => document.querySelector(sel);

  const barajar = (lista) => {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ---------------------------------------------------------------------------
  // Nieve: pocos copos, chicos y transparentes. Detalle, no protagonista.
  // ---------------------------------------------------------------------------
  function nevar(contenedor, cantidad) {
    if (reducirMovimiento) return;
    for (let i = 0; i < cantidad; i++) {
      const copo = document.createElement("span");
      const tam = 2 + Math.random() * 4;
      copo.className = "copo";
      copo.style.cssText =
        `left:${Math.random() * 100}%;width:${tam}px;height:${tam}px;` +
        `opacity:${0.4 + Math.random() * 0.6};` +
        `animation-duration:${14 + Math.random() * 16}s;` +
        `animation-delay:${-Math.random() * 30}s;` +
        `--deriva:${Math.round(Math.random() * 60 - 30)}px`;
      contenedor.appendChild(copo);
    }
  }
  document.querySelectorAll(".nieve").forEach((n) => nevar(n, innerWidth < 600 ? 14 : 26));

  // ---------------------------------------------------------------------------
  // Salvapantallas: carpeta → cursor → se abre → pila de fotos → saludo.
  // ---------------------------------------------------------------------------
  const salva = $("#salvapantallas");
  const carpetaWrap = $(".carpeta-wrap");
  const carpeta = $(".carpeta");
  const cursor = $(".cursor");
  const pila = $(".pila");
  const cierre = $(".cierre");

  let temporizadores = [];
  const luego = (ms, fn) => temporizadores.push(setTimeout(fn, ms));

  /** Inclinaciones fijas por profundidad (no aleatorias), para que la pila no
   * "tiemble" cada vez que se reacomoda. */
  const INCLINACION = [-6, 4, -3, 7, -5, 2, -8, 5];

  function armarPila(fotos) {
    pila.innerHTML = "";
    pila.classList.remove("sale");
    return fotos.map((foto) => {
      const carta = document.createElement("div");
      carta.className = "foto-carta";
      // La tarjeta toma la forma de la foto; el ancho se limita para que una
      // foto horizontal no se salga de una pantalla vertical.
      carta.style.width = `min(calc(var(--alto-foto) * ${foto.w / foto.h}), 84vw)`;
      carta.style.aspectRatio = `${foto.w} / ${foto.h}`;
      const img = new Image();
      img.src = foto.src;
      img.alt = "";
      img.draggable = false;
      carta.appendChild(img);
      pila.appendChild(carta);
      return carta;
    });
  }

  function acomodarPila(cartas, actual) {
    cartas.forEach((carta, i) => {
      const prof = i - actual;
      if (prof < 0) {
        // La de arriba se va de costado, como si la descartaran.
        carta.classList.add("descartada");
        carta.style.setProperty("--x", "85vmin");
        carta.style.setProperty("--y", "0px");
        carta.style.setProperty("--r", "16deg");
        carta.style.setProperty("--s", "1");
        return;
      }
      carta.classList.toggle("visible", prof < 5);
      carta.style.zIndex = String(20 - prof);
      carta.style.setProperty("--x", `${prof * 11}px`);
      carta.style.setProperty("--y", `${prof * -16}px`);
      carta.style.setProperty("--r", `${reducirMovimiento ? 0 : INCLINACION[prof % INCLINACION.length]}deg`);
      carta.style.setProperty("--s", String(1 - prof * 0.04));
    });
  }

  function pasada() {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];

    carpetaWrap.className = "carpeta-wrap";
    carpeta.className = "carpeta";
    cursor.className = "cursor";
    cierre.className = "cierre";

    const fotos = barajar(DATOS.fotos).slice(0, MAX_FOTOS_PILA);
    const cartas = armarPila(fotos);

    requestAnimationFrame(() => requestAnimationFrame(() => carpetaWrap.classList.add("entra")));

    luego(ACTO.cursor * PASADA_MS, () => cursor.classList.add("entra"));
    luego(ACTO.abrir * PASADA_MS, () => {
      cursor.classList.add("clic");
      carpeta.classList.add("clic", "abierta");
    });

    if (cartas.length) {
      luego(ACTO.fotos * PASADA_MS, () => {
        cursor.classList.add("sale");
        carpetaWrap.classList.add("sale");
        acomodarPila(cartas, 0);
      });
      const ventana = (ACTO.cierre - ACTO.fotos) * PASADA_MS;
      const porFoto = ventana / cartas.length;
      for (let i = 1; i < cartas.length; i++) {
        luego(ACTO.fotos * PASADA_MS + porFoto * i, () => acomodarPila(cartas, i));
      }
      luego(ACTO.cierre * PASADA_MS, () => pila.classList.add("sale"));
    } else {
      luego(ACTO.fotos * PASADA_MS, () => {
        cursor.classList.add("sale");
        carpetaWrap.classList.add("sale");
      });
    }

    luego(ACTO.cierre * PASADA_MS + 250, () => cierre.classList.add("entra"));
    luego(PASADA_MS - 600, () => cierre.classList.remove("entra"));
    luego(PASADA_MS, pasada);
  }

  function detenerSalva() {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
  }

  // Precarga las fotos para que la pila no aparezca con huecos.
  DATOS.fotos.forEach((f) => (new Image().src = f.src));

  // ---------------------------------------------------------------------------
  // Carrusel de cartas
  // ---------------------------------------------------------------------------
  const pista = $("#pista");
  const nombres = $("#nombres");
  const lateralLista = $("#lateral-lista");
  const btnsAnterior = document.querySelectorAll('[data-ir="-1"]');
  const btnsSiguiente = document.querySelectorAll('[data-ir="1"]');

  const diapositivas = [];
  const chips = [];
  const enlacesLateral = [];
  let actual = 0;

  function crearPaginas(paginas, nombre) {
    return paginas.map((p, i) => {
      const img = document.createElement("img");
      img.className = "hoja-pagina";
      img.src = p.src;
      img.width = p.w;
      img.height = p.h;
      img.alt = paginas.length > 1 ? `Carta de ${nombre}, página ${i + 1}` : `Carta de ${nombre}`;
      img.decoding = "async";
      return img;
    });
  }

  function agregarDiapositiva(nombre, contenido) {
    const diapo = document.createElement("section");
    diapo.className = "diapositiva";
    diapo.setAttribute("aria-roledescription", "carta");
    diapo.setAttribute("aria-label", `Carta de ${nombre}`);
    const hoja = document.createElement("article");
    hoja.className = "hoja";
    hoja.tabIndex = 0;
    hoja.append(...contenido);
    diapo.appendChild(hoja);
    pista.appendChild(diapo);

    const indice = diapositivas.length;
    const li = document.createElement("li");
    const chip = document.createElement("button");
    chip.className = "nombre";
    chip.type = "button";
    chip.textContent = nombre;
    chip.addEventListener("click", () => irA(indice));
    li.appendChild(chip);
    nombres.appendChild(li);

    // La misma entrada en el menú lateral de escritorio.
    const liLat = document.createElement("li");
    const enlace = document.createElement("button");
    enlace.className = "lateral-item";
    enlace.type = "button";
    const num = document.createElement("span");
    num.className = "lateral-num";
    num.textContent = String(indice + 1).padStart(2, "0");
    enlace.append(num, document.createTextNode(nombre));
    enlace.addEventListener("click", () => irA(indice));
    liLat.appendChild(enlace);
    lateralLista.appendChild(liLat);

    diapositivas.push(diapo);
    chips.push(chip);
    enlacesLateral.push(enlace);
  }

  // --- Visor: la carta a pantalla completa y más grande, para leerla bien. ---
  const visor = $("#visor");
  const visorScroll = $("#visor-scroll");
  let focoAntesDelVisor = null;

  // Un video sacado del visor puede seguir sonando si no se pausa antes.
  function vaciarVisor() {
    const video = visorScroll.querySelector("video");
    if (video) video.pause();
    visorScroll.innerHTML = "";
  }

  function abrirVisor(paginas, nombre, desde = 0) {
    vaciarVisor();
    visorScroll.append(...crearPaginas(paginas, nombre).map((img) => ((img.style.cursor = "auto"), img)));
    // Al pasar de foto el visor ya está abierto: el foco a devolver es el de antes.
    if (visor.hidden) focoAntesDelVisor = document.activeElement;
    visor.hidden = false;
    // Abre en la página tocada, no siempre en la primera.
    requestAnimationFrame(() => {
      const destino = visorScroll.children[desde];
      visorScroll.scrollTop = destino ? destino.offsetTop : 0;
      visorScroll.scrollLeft = (visorScroll.scrollWidth - visorScroll.clientWidth) / 2;
    });
    $("#visor-cerrar").focus({ preventScroll: true });
  }
  // Fotos y videos de la galería: con flechas se pasa de uno a otro sin
  // cerrar el visor, en el mismo orden en que aparecen en la galería.
  let mediosVisor = [];
  let medioVisor = 0;
  function abrirMedio(medios, i, desdeSegundo = 0) {
    mediosVisor = medios;
    medioVisor = i;
    const m = medios[i];
    if (m.tipo === "video") {
      if (visor.hidden) focoAntesDelVisor = document.activeElement;
      vaciarVisor();
      const video = document.createElement("video");
      video.src = m.src;
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      video.setAttribute("aria-label", `Video ${i + 1} de ${medios.length}`);
      if (desdeSegundo) video.addEventListener("loadedmetadata", () => (video.currentTime = desdeSegundo), { once: true });
      visorScroll.appendChild(video);
      visor.hidden = false;
      $("#visor-cerrar").focus({ preventScroll: true });
    } else {
      abrirVisor([m], "Victor");
      visorScroll.firstChild.alt = `Foto ${i + 1} de ${medios.length}`;
    }
    visor.classList.add("visor-foto");
    $("#visor-anterior").disabled = i === 0;
    $("#visor-siguiente").disabled = i === medios.length - 1;
  }
  function moverFoto(paso) {
    const i = medioVisor + paso;
    if (!visor.classList.contains("visor-foto") || i < 0 || i >= mediosVisor.length) return;
    const foco = document.activeElement;
    abrirMedio(mediosVisor, i);
    // Que el foco siga en la flecha usada, para poder seguir con Enter.
    if (foco && foco.classList.contains("visor-flecha") && !foco.disabled) foco.focus({ preventScroll: true });
  }
  $("#visor-anterior").addEventListener("click", () => moverFoto(-1));
  $("#visor-siguiente").addEventListener("click", () => moverFoto(1));
  // En el celular también se pasa deslizando de lado.
  let toqueVisor = null;
  visor.addEventListener("touchstart", (e) => {
    // Arrastrar la barra de un video no debe cambiar de foto.
    if (e.touches.length !== 1 || e.target.closest("video")) return (toqueVisor = null);
    toqueVisor = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  visor.addEventListener("touchend", (e) => {
    if (!toqueVisor) return;
    const dx = e.changedTouches[0].clientX - toqueVisor.x;
    const dy = e.changedTouches[0].clientY - toqueVisor.y;
    toqueVisor = null;
    // Con zoom de dedos el gesto es para moverse dentro de la foto.
    if (window.visualViewport && visualViewport.scale > 1.05) return;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) moverFoto(dx < 0 ? 1 : -1);
  }, { passive: true });

  function cerrarVisor() {
    if (visor.hidden) return;
    visor.hidden = true;
    visor.classList.remove("visor-foto");
    mediosVisor = [];
    vaciarVisor();
    if (focoAntesDelVisor) focoAntesDelVisor.focus({ preventScroll: true });
  }
  $("#visor-cerrar").addEventListener("click", cerrarVisor);

  const ICONO_LUPA =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

  DATOS.cartas.forEach((c) => {
    const paginas = crearPaginas(c.paginas, c.nombre);
    paginas.forEach((img, i) => img.addEventListener("click", () => abrirVisor(c.paginas, c.nombre, i)));
    const ampliar = document.createElement("button");
    ampliar.className = "ampliar";
    ampliar.type = "button";
    ampliar.innerHTML = `${ICONO_LUPA}<span>Ampliar</span>`;
    ampliar.setAttribute("aria-label", `Ampliar la carta de ${c.nombre}`);
    ampliar.addEventListener("click", () => abrirVisor(c.paginas, c.nombre));
    agregarDiapositiva(c.nombre, [...paginas, ampliar]);
    const hoja = diapositivas[diapositivas.length - 1].querySelector(".hoja");
    hoja.classList.add("hoja-carta");
    // Con varias páginas, en el celular cada una llena el recuadro y no se ve
    // que hay más abajo: un aviso que se va apenas se desliza.
    if (c.paginas.length > 1) {
      const aviso = document.createElement("p");
      aviso.className = "mas-paginas";
      aviso.textContent = `Desliza hacia abajo · ${c.paginas.length} páginas`;
      hoja.prepend(aviso);
      hoja.addEventListener("scroll", () => aviso.classList.toggle("oculto", hoja.scrollTop > 40), { passive: true });
    }
  });

  // --- Carta final de Meraki: escritura arriba, cuadro de fotos abajo. ---
  const collage = document.createElement("div");
  collage.className = "collage";
  collage.setAttribute("aria-label", "Fotos de Victor");
  {
    const meraki = document.createElement("div");
    meraki.className = "meraki";
    const paginasMeraki = DATOS.meraki && DATOS.meraki.paginas ? DATOS.meraki.paginas : [];

    if (paginasMeraki.length) {
      const cont = document.createElement("div");
      cont.className = "meraki-paginas";
      cont.append(...crearPaginas(paginasMeraki, "Meraki"));
      meraki.appendChild(cont);
    } else {
      const pre = document.createElement("p");
      pre.className = "meraki-pre";
      pre.textContent = CARTA_MERAKI.pre;
      const titulo = document.createElement("h3");
      titulo.className = "meraki-titulo";
      titulo.textContent = CARTA_MERAKI.titulo;
      const texto = document.createElement("div");
      texto.className = "meraki-texto";
      CARTA_MERAKI.parrafos.forEach((t) => {
        const p = document.createElement("p");
        p.textContent = t;
        texto.appendChild(p);
      });
      const firma = document.createElement("p");
      firma.className = "meraki-firma";
      firma.textContent = CARTA_MERAKI.firma;
      meraki.append(pre, titulo, texto, firma);
    }

    if (DATOS.fotos.length) meraki.appendChild(collage);
    agregarDiapositiva("Meraki", [meraki]);
  }

  // --- Galería: todas las fotos y los videos, después de Meraki. ---
  const videos = [];
  const fotosGaleria = DATOS.fotos || [];
  const videosGaleria = DATOS.videos || [];
  if (fotosGaleria.length || videosGaleria.length) {
    const cont = document.createElement("div");
    cont.className = "galeria";
    const pre = document.createElement("p");
    pre.className = "meraki-pre";
    pre.textContent = "Para reír y recordar";
    const titulo = document.createElement("h3");
    titulo.className = "meraki-titulo";
    titulo.textContent = "Galería";
    const grilla = document.createElement("div");
    grilla.className = "galeria-grilla";

    // Lo que se recorre en el visor, en el orden de la grilla.
    const medios = [];

    const crearVideo = (v) => {
      const indice = medios.push({ tipo: "video", src: v.src }) - 1;
      const figura = document.createElement("figure");
      figura.className = "galeria-item video";
      const video = document.createElement("video");
      // "#t=0.1" hace que el navegador muestre el primer cuadro como portada
      // (sin eso, Safari en iPhone deja el recuadro negro hasta darle play).
      video.src = `${v.src}#t=0.1`;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.addEventListener("loadedmetadata", () => {
        if (video.videoWidth) video.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
      });
      // Uno a la vez: si arranca uno, se pausan los demás.
      video.addEventListener("play", () => videos.forEach((o) => o !== video && o.pause()));
      figura.appendChild(video);
      const ampliar = document.createElement("button");
      ampliar.className = "ampliar ampliar-video";
      ampliar.type = "button";
      ampliar.innerHTML = `${ICONO_LUPA}<span>Ampliar</span>`;
      ampliar.setAttribute("aria-label", v.titulo ? `Ampliar el video ${v.titulo}` : "Ampliar el video");
      ampliar.addEventListener("click", () => {
        // Sigue en el visor desde donde iba, en vez de empezar de cero.
        const desde = video.paused ? 0 : video.currentTime;
        pausarVideos();
        abrirMedio(medios, indice, desde);
      });
      figura.appendChild(ampliar);
      if (v.titulo) {
        const pie = document.createElement("figcaption");
        pie.textContent = v.titulo;
        figura.appendChild(pie);
      }
      videos.push(video);
      return figura;
    };

    const crearFoto = (f, i) => {
      const indice = medios.push({ tipo: "foto", ...f }) - 1;
      const figura = document.createElement("figure");
      figura.className = "galeria-item";
      const img = document.createElement("img");
      img.src = f.src;
      img.width = f.w;
      img.height = f.h;
      img.alt = `Foto ${i + 1}`;
      img.decoding = "async";
      img.addEventListener("click", () => abrirMedio(medios, indice));
      figura.appendChild(img);
      return figura;
    };

    // Fotos y videos intercalados: un video cada pocas fotos, para que los
    // videos no queden todos amontonados al final.
    const cada = Math.max(1, Math.round(fotosGaleria.length / Math.max(1, videosGaleria.length)));
    let v = 0;
    fotosGaleria.forEach((f, i) => {
      grilla.appendChild(crearFoto(f, i));
      if ((i + 1) % cada === 0 && v < videosGaleria.length) grilla.appendChild(crearVideo(videosGaleria[v++]));
    });
    while (v < videosGaleria.length) grilla.appendChild(crearVideo(videosGaleria[v++]));

    cont.append(pre, titulo, grilla);
    agregarDiapositiva("Galería", [cont]);
  }
  const pausarVideos = () => videos.forEach((v) => v.pause());

  /** Columnas que suben y bajan alternadas. Cada columna recibe sus fotos
   * corridas respecto de la anterior, así dos columnas vecinas no muestran la
   * misma foto a la misma altura. */
  let columnasActuales = 0;
  function armarCollage() {
    if (!DATOS.fotos.length) return;
    const ancho = collage.clientWidth || innerWidth;
    const cols = ancho < 420 ? 2 : ancho < 700 ? 3 : 4;
    if (cols === columnasActuales) return;
    columnasActuales = cols;
    collage.style.setProperty("--cols", cols);
    collage.innerHTML = "";

    const orden = barajar(DATOS.fotos);
    // Con pocas fotos se repiten: una copia de la columna tiene que ser más
    // alta que el cuadro, si no el loop deja ver el hueco.
    const porColumna = Math.max(5, Math.ceil(orden.length / cols));
    const corrimiento = Math.max(1, Math.floor(orden.length / cols));
    for (let c = 0; c < cols; c++) {
      const col = document.createElement("div");
      col.className = "collage-col" + (c % 2 ? " baja" : "");
      col.style.setProperty("--duracion", `${porColumna * (5.5 + (c % 3) * 0.8)}s`);
      const fotos = [];
      for (let i = 0; i < porColumna; i++) fotos.push(orden[(i + c * corrimiento) % orden.length]);
      [...fotos, ...fotos].forEach((f) => {
        const img = document.createElement("img");
        img.className = "collage-foto";
        img.src = f.src;
        img.alt = "";
        img.draggable = false;
        // Proporciones acotadas: una panorámica no deja una franja finita y
        // una muy vertical no se come la columna.
        img.style.aspectRatio = String(Math.min(1.4, Math.max(0.7, f.w / f.h)));
        col.appendChild(img);
      });
      collage.appendChild(col);
    }
  }

  function irA(indice, { suave = true } = {}) {
    const nuevo = Math.max(0, Math.min(diapositivas.length - 1, indice));
    if (nuevo !== actual) pausarVideos();
    actual = nuevo;
    pista.style.transform = `translateX(${-actual * 100}%)`;
    diapositivas.forEach((d, i) => {
      d.classList.toggle("activa", i === actual);
      d.setAttribute("aria-hidden", String(i !== actual));
      d.inert = i !== actual;
    });
    chips.forEach((c, i) => c.setAttribute("aria-current", String(i === actual)));
    enlacesLateral.forEach((e, i) => e.setAttribute("aria-current", String(i === actual)));
    btnsAnterior.forEach((b) => (b.disabled = actual === 0));
    btnsSiguiente.forEach((b) => (b.disabled = actual === diapositivas.length - 1));

    const hoja = diapositivas[actual].querySelector(".hoja");
    hoja.scrollTop = 0;

    // Lleva el nombre activo al centro de la barra de nombres.
    const chip = chips[actual];
    const destino = chip.offsetLeft - (nombres.clientWidth - chip.offsetWidth) / 2;
    nombres.scrollTo({ left: destino, behavior: suave ? "smooth" : "instant" });

    if (diapositivas[actual].contains(collage)) armarCollage();
  }

  btnsAnterior.forEach((b) => b.addEventListener("click", () => irA(actual - 1)));
  btnsSiguiente.forEach((b) => b.addEventListener("click", () => irA(actual + 1)));

  // Hamburguesa: muestra u oculta el menú lateral. Se recuerda entre visitas.
  const cartasEl = $("#cartas");
  const hamburguesa = $("#hamburguesa");
  function ponerLateral(abierto) {
    cartasEl.classList.toggle("lateral-cerrado", !abierto);
    hamburguesa.setAttribute("aria-expanded", String(abierto));
    $("#lateral").inert = !abierto;
  }
  let lateralAbierto = true;
  try {
    lateralAbierto = localStorage.getItem("lateral") !== "cerrado";
  } catch {}
  ponerLateral(lateralAbierto);
  hamburguesa.addEventListener("click", () => {
    lateralAbierto = !lateralAbierto;
    ponerLateral(lateralAbierto);
    try {
      localStorage.setItem("lateral", lateralAbierto ? "abierto" : "cerrado");
    } catch {}
  });

  // Deslizar con el dedo. Solo cuenta si el gesto es claramente horizontal,
  // para no pelear con el scroll vertical de la carta.
  const carrusel = $("#carrusel");
  let toque = null;
  carrusel.addEventListener("touchstart", (e) => {
    // Arrastrar la barra de un video no debe cambiar de carta.
    if (e.touches.length !== 1 || e.target.closest("video")) return (toque = null);
    toque = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  carrusel.addEventListener("touchend", (e) => {
    if (!toque) return;
    const dx = e.changedTouches[0].clientX - toque.x;
    const dy = e.changedTouches[0].clientY - toque.y;
    toque = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) irA(actual + (dx < 0 ? 1 : -1));
  }, { passive: true });

  let ultimoAncho = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === ultimoAncho) return;
    ultimoAncho = innerWidth;
    irA(actual, { suave: false });
  });

  // ---------------------------------------------------------------------------
  // Cambio entre salvapantallas y cartas
  // ---------------------------------------------------------------------------
  let enSalva = true;
  let ultimaActividad = Date.now();

  function mostrarCartas() {
    if (!enSalva) return;
    enSalva = false;
    detenerSalva();
    salva.classList.add("oculto");
    salva.setAttribute("aria-hidden", "true");
    irA(actual, { suave: false });
    reiniciarInactividad();
  }

  function mostrarSalva() {
    if (enSalva) return;
    enSalva = true;
    pausarVideos();
    cerrarVisor();
    salva.classList.remove("oculto");
    salva.removeAttribute("aria-hidden");
    pasada();
  }

  function reiniciarInactividad() {
    ultimaActividad = Date.now();
  }

  // Se revisa cada pocos segundos contra la hora de la última actividad, en
  // vez de un único setTimeout: así un video sonando también cuenta como
  // actividad, y el conteo no se descuadra si la pestaña estuvo en segundo plano.
  setInterval(() => {
    if (enSalva) return;
    const enVisor = visorScroll.querySelector("video");
    if ([...videos, enVisor].some((v) => v && !v.paused && !v.ended)) return reiniciarInactividad();
    if (Date.now() - ultimaActividad >= INACTIVIDAD_MS) mostrarSalva();
  }, 5000);

  // Cualquier clic, toque o tecla saca el salvapantallas.
  salva.addEventListener("pointerdown", mostrarCartas);
  addEventListener("keydown", (e) => {
    if (!visor.hidden) {
      if (e.key === "Escape") cerrarVisor();
      if (e.key === "ArrowRight") moverFoto(1);
      if (e.key === "ArrowLeft") moverFoto(-1);
      return;
    }
    if (enSalva) {
      e.preventDefault();
      return mostrarCartas();
    }
    if (e.key === "ArrowRight") irA(actual + 1);
    if (e.key === "ArrowLeft") irA(actual - 1);
  });

  // Mientras se leen las cartas, cualquier actividad cuenta, incluido mover
  // el mouse: alguien leyendo en el computador puede no hacer clic en minutos.
  ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "touchmove", "scroll"].forEach((ev) =>
    addEventListener(ev, () => !enSalva && reiniciarInactividad(), { passive: true, capture: true })
  );

  irA(0, { suave: false });
  pasada();

  // index.html#cartas entra directo a las cartas; #cartas-3, a la tercera.
  const atajo = location.hash.match(/^#cartas(?:-(\d+))?$/);
  if (atajo) {
    actual = Math.max(0, (Number(atajo[1]) || 1) - 1);
    mostrarCartas();
  }
})();
