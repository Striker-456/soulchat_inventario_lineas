import { useCallback, useMemo, useRef, useState } from "react";
import {
  api,
  errorMessage,
  type ImportConnectly,
  type ImportCreado,
  type ImportFila,
  type ImportSmart,
} from "../api";
import { useCatalogos } from "../context/CatalogosContext";
import { normalize } from "../lib/format";
import { Modal, Button, Badge, ErrorBanner, Spinner } from "./ui";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILAS_POR_ENVIO = 500; // límite del endpoint /lineas/importar

interface ImportRow extends ImportFila {
  /** Número de renglón en el archivo (el 1 es el encabezado, si no hay comentarios antes). */
  linea: number;
  errores: string[];
  /** Nombres de catálogo que no existen y el servidor creará ("Cliente: Acme"). */
  nuevos: string[];
}

interface Resultado {
  total: number;
  creadas: number;
  /** Errores que devolvió el servidor, con el renglón del archivo. */
  errores: { linea: number; numero: string | null; mensajes: string[] }[];
  catalogosCreados: ImportCreado[];
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
const esComentario = (texto: string) => texto.trimStart().startsWith("#");

/**
 * Parser CSV mínimo (RFC 4180): comillas dobles, separadores y saltos de línea dentro de comillas.
 * Devuelve cada registro con el renglón del archivo donde empieza.
 */
function parseCsv(text: string): { cells: string[]; line: number }[] {
  const clean = text.replace(/^﻿/, "");
  // El separador se deduce de la primera línea que no es comentario (el encabezado).
  const headerLine =
    clean.split(/\r?\n/).find((l) => l.trim() !== "" && !esComentario(l)) ?? "";
  const sep = [";", "\t", ","].sort(
    (a, b) => headerLine.split(b).length - headerLine.split(a).length,
  )[0];

  const rows: { cells: string[]; line: number }[] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowStart = 1;

  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((f) => f.trim() !== ""))
      rows.push({ cells: row, line: rowStart });
    row = [];
  };

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === "\n" || (c === "\r" && clean[i + 1] !== "\n")) line++;
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") {
        i++;
        line++;
      }
      pushRow();
      rowStart = line;
    } else field += c;
  }
  pushRow();
  return rows;
}

/**
 * Decodifica el archivo: Excel guarda "CSV UTF-8" o "CSV (delimitado por comas)" en Windows-1252,
 * así que si no es UTF-8 válido se lee como Windows-1252 (si no, "Contraseña" llega como "Contrase�a").
 */
function decodificar(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** "Status Desarrollo" → "status_desarrollo", "Factura???" → "factura", "Contraseña" → "contrasena". */
const claveEncabezado = (h: string) =>
  normalize(h)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Celda limpia: sin espacios (incluido el no separable de Excel) ni saltos de línea en los extremos. */
const celda = (v: string | undefined) => (v ?? "").trim();

/** Quita espacios, guiones, puntos y paréntesis: "57316 9006116" → "573169006116". */
const limpiarNumero = (v: string) => v.replace(/[\s\-.()]/g, "");
const esNumeroTelefono = (v: string) => /^\+?\d{7,15}$/.test(limpiarNumero(v));

type GeneralKey = Exclude<keyof ImportFila, "connectly" | "smart">;

/**
 * Encabezados aceptados por campo (ya pasados por `claveEncabezado`). Incluyen los nombres exactos
 * de las hojas de control «Cuentas Connectly» y «COS-Smart Data & Automation - Control de Líneas».
 */
const GENERAL_COLS: Record<GeneralKey, string[]> = {
  numero: ["numero", "numero_connectly", "numero_linea", "numero_de_linea", "linea", "telefono", "number"],
  cliente: ["cliente", "client", "empresa"],
  status: ["status", "status_desarrollo", "estado_desarrollo"],
  coordinador: ["coordinador", "coordinador_asignado", "coordinator"],
  programador: ["programador", "developer"],
  tenencia: ["tenencia", "tenencia_sim", "tenencia_sim_card"],
  descripcionUso: ["descripcion", "descripcion_uso", "descripcion_de_uso"],
};

const CONNECTLY_COLS: Record<keyof ImportConnectly, string[]> = {
  usuario: ["usuario"],
  contrasena: ["contrasena", "password"],
  businessId: ["business_id"],
  apiKey: ["api_key"],
  webhook: ["webhook"],
  dns: ["dns"],
};

const SMART_COLS: Record<keyof ImportSmart, string[]> = {
  estado: ["estado", "estado_smart"],
  tipoActivacion: ["tipo_activacion"],
  companyCampanasBotai: ["company_campanas_botai"],
  bsp: ["bsp"],
  webhookCampanas: ["webhook_campanas"],
  webhookCos: ["webhook_cos"],
  webhookSda: ["webhook_sda"],
  usuarioCompanyId: ["usuario_companyid", "usuario_company_id"],
  clave: ["clave"],
  companyBot: ["company_bot"],
  botId: ["bot_id"],
  botVersion: ["bot_version"],
  appChannel: ["app_channel"],
  companyIdCampanas: ["company_id_campanas"],
  envioPush: ["envio_push", "envio_de_push"],
  uso: ["uso"],
  observaciones: ["observaciones"],
  fechaVerificacion: ["fecha_verificacion", "fecha_de_verificacion"],
  facturado: ["facturado", "factura"],
};

/** Acepta el nombre corto y el prefijado por módulo (formato anterior: "connectly_usuario", "smart_bsp"). */
const conPrefijo = <K extends string>(cols: Record<K, string[]>, prefijo: string) =>
  Object.fromEntries(
    Object.entries<string[]>(cols).map(([k, alias]) => [
      k,
      [...alias, ...alias.map((a) => `${prefijo}_${a}`)],
    ]),
  ) as Record<K, string[]>;

const CONNECTLY_ALIAS = conPrefijo(CONNECTLY_COLS, "connectly");
const SMART_ALIAS = conPrefijo(SMART_COLS, "smart");

const TODOS_LOS_ALIAS = new Set(
  [GENERAL_COLS, CONNECTLY_ALIAS, SMART_ALIAS].flatMap((cols) =>
    Object.values<string[]>(cols).flat(),
  ),
);

/** Posición de cada campo en el encabezado (-1 si no está). */
const indices = <K extends string>(cols: Record<K, string[]>, headers: string[]) =>
  Object.fromEntries(
    Object.entries<string[]>(cols).map(([k, alias]) => [
      k,
      headers.findIndex((h) => alias.includes(h)),
    ]),
  ) as Record<K, number>;

interface Lectura {
  rows: ImportRow[];
  /** Encabezados del archivo que no corresponden a ningún campo (se ignoran). */
  ignoradas: string[];
  /** Ajustes que se hicieron para poder leer el archivo, para mostrarlos al usuario. */
  avisos: string[];
}

function toRows(csv: { cells: string[]; line: number }[]): Lectura {
  const data = csv.filter((r) => !esComentario(r.cells[0] ?? ""));
  const avisos: string[] = [];

  // El encabezado es la fila (entre las primeras) con más columnas reconocidas: las hojas de control
  // a veces traen filas sueltas antes del encabezado.
  let headerPos = -1;
  let mejor = 1;
  data.slice(0, 10).forEach((r, i) => {
    const reconocidas = r.cells.filter((c) => TODOS_LOS_ALIAS.has(claveEncabezado(c))).length;
    if (reconocidas > mejor) {
      mejor = reconocidas;
      headerPos = i;
    }
  });
  if (headerPos < 0) return { rows: [], ignoradas: [], avisos };
  if (headerPos > 0)
    avisos.push(
      `Se omitieron ${headerPos} fila(s) antes del encabezado (renglón ${data[headerPos].line}).`,
    );

  const rawHeaders = data[headerPos].cells.map(celda);
  const headers = rawHeaders.map(claveEncabezado);
  const body = data.slice(headerPos + 1);

  const general = indices(GENERAL_COLS, headers);
  const connectly = indices(CONNECTLY_ALIAS, headers);
  const smart = indices(SMART_ALIAS, headers);

  // Sin columna de número reconocida: se usa la columna cuyo encabezado está vacío o es un teléfono
  // (alguien escribió sobre el título) y cuyos valores son, en su mayoría, teléfonos.
  if (general.numero < 0) {
    general.numero = headers.findIndex((h, i) => {
      if (h !== "" && !esNumeroTelefono(rawHeaders[i])) return false;
      const valores = body.map((r) => celda(r.cells[i])).filter(Boolean);
      return valores.length > 0 && valores.filter(esNumeroTelefono).length / valores.length >= 0.8;
    });
    if (general.numero >= 0)
      avisos.push(
        `La columna ${general.numero + 1} ("${rawHeaders[general.numero] || "sin título"}") se tomó como número de línea.`,
      );
  }

  // Hoja Smart: la columna sin título con datos es el estado operativo (ACTIVO, INACTIVO, SIN RESPUESTA…).
  const esHojaSmart = Object.values<number>(smart).filter((i) => i >= 0).length >= 3;
  if (esHojaSmart && smart.estado < 0) {
    smart.estado = headers.findIndex(
      (h, i) => h === "" && i !== general.numero && body.some((r) => celda(r.cells[i]) !== ""),
    );
    if (smart.estado >= 0)
      avisos.push(`La columna ${smart.estado + 1} (sin título) se tomó como Estado de Smart.`);
  }

  const usadas = new Set(
    [general, connectly, smart].flatMap((m) => Object.values<number>(m)),
  );
  const ignoradas = rawHeaders.filter((h, i) => h !== "" && !usadas.has(i));

  const rows: ImportRow[] = [];
  let titulos = 0;
  for (const { cells, line } of body) {
    const at = (i: number) => (i >= 0 ? celda(cells[i]) : "");
    const numero = limpiarNumero(at(general.numero));

    // Filas de título intermedias ("Lineas y BIM inactiva por META"): un solo texto que no es un teléfono.
    if (!esNumeroTelefono(numero) && cells.filter((c) => celda(c) !== "").length <= 1) {
      titulos++;
      continue;
    }

    const leer = <K extends string>(idx: Record<K, number>) => {
      const values = Object.fromEntries(
        Object.entries<number>(idx).map(([k, i]) => [k, at(i)]),
      ) as Record<K, string>;
      // Si todas las columnas del módulo vienen vacías, el módulo se omite.
      return Object.values<string>(values).some((v) => v !== "") ? values : undefined;
    };

    rows.push({
      linea: line,
      numero,
      cliente: at(general.cliente),
      status: at(general.status),
      coordinador: at(general.coordinador),
      programador: at(general.programador),
      tenencia: at(general.tenencia),
      descripcionUso: at(general.descripcionUso),
      connectly: leer(connectly),
      smart: leer(smart),
      errores: [],
      nuevos: [],
    });
  }
  if (titulos > 0) avisos.push(`Se omitieron ${titulos} fila(s) de título sin número.`);

  return { rows, ignoradas, avisos };
}

// ─── Plantilla ────────────────────────────────────────────────────────────────
// Mismos encabezados que las hojas de control, para poder copiar y pegar columnas desde Excel.
const PLANTILLA_GENERAL: [GeneralKey, string][] = [
  ["numero", "Numero"],
  ["cliente", "Cliente"],
  ["descripcionUso", "Descripcion Uso"],
  ["status", "Status Desarrollo"],
  ["coordinador", "Coordinador Asignado"],
  ["tenencia", "Tenencia Sim Card"],
  ["programador", "Programador"],
];
const PLANTILLA_CONNECTLY: [keyof ImportConnectly, string][] = [
  ["usuario", "Usuario"],
  ["contrasena", "Contraseña"],
  ["businessId", "Business ID"],
  ["apiKey", "API Key"],
  ["webhook", "Webhook"],
  ["dns", "DNS"],
];
const PLANTILLA_SMART: [keyof ImportSmart, string][] = [
  ["estado", "Estado"],
  ["tipoActivacion", "Tipo Activacion"],
  ["companyCampanasBotai", "Company Campañas BOTAI"],
  ["bsp", "BSP"],
  ["webhookCampanas", "Webhook campañas"],
  ["webhookCos", "Webhook COS"],
  ["webhookSda", "Webhook SDA"],
  ["usuarioCompanyId", "Usuario CompanyID"],
  ["clave", "Clave"],
  ["companyBot", "Company BOT"],
  ["botId", "BOT ID"],
  ["botVersion", "Bot Version"],
  ["appChannel", "APP Channel"],
  ["companyIdCampanas", "Company ID Campañas"],
  ["envioPush", "Envío de Push"],
  ["uso", "Uso"],
  ["observaciones", "Observaciones"],
  ["fechaVerificacion", "Fecha de Verificacion"],
  ["facturado", "Facturado"],
];
const TEMPLATE_HEADER = [...PLANTILLA_GENERAL, ...PLANTILLA_CONNECTLY, ...PLANTILLA_SMART].map(
  ([, titulo]) => titulo,
);

/** Arma una fila de la plantilla (separada por ";", como la exporta Excel en español). */
const templateRow = (values: Record<string, string>) =>
  TEMPLATE_HEADER.map((h) => {
    const v = values[h] ?? "";
    return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(";");

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ImportModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  /** Se llama al cerrar si se importó al menos una línea (para recargar la lista y los catálogos). */
  onDone: (creadas: number, catalogosCreados: number) => void;
}) {
  const { clientes, empleados, status, tenencias, bsps } = useCatalogos();
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [lectura, setLectura] = useState<Omit<Lectura, "rows">>({
    ignoradas: [],
    avisos: [],
  });
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Nombre normalizado de cada catálogo, para anticipar en la vista previa qué se creará.
  const index = useMemo(() => {
    const set = (items: { nombre: string }[]) =>
      new Set(items.map((i) => normalize(i.nombre).replace(/\s+/g, " ")));
    return {
      clientes: set(clientes),
      empleados: set(empleados),
      status: set(status),
      tenencias: set(tenencias),
      bsps: set(bsps),
    };
  }, [clientes, empleados, status, tenencias, bsps]);

  const validar = useCallback(
    (parsed: ImportRow[]): ImportRow[] => {
      const vistos = new Set<string>();
      return parsed.map((r) => {
        // Solo el número es obligatorio; lo demás es opcional y los catálogos faltantes se crean en el servidor.
        const errores: string[] = [];
        if (!r.numero) errores.push("El número es requerido.");
        else if (!esNumeroTelefono(r.numero))
          errores.push(`"${r.numero}" no es un número de teléfono válido.`);
        else if (vistos.has(r.numero))
          errores.push("El número está repetido en el archivo.");
        else vistos.add(r.numero);

        const nuevos: string[] = [];
        const revisar = (
          valor: string | undefined,
          catalogo: Set<string>,
          etiqueta: string,
        ) => {
          if (valor && !catalogo.has(normalize(valor).replace(/\s+/g, " ")))
            nuevos.push(`${etiqueta}: ${valor}`);
        };
        revisar(r.cliente, index.clientes, "Cliente");
        revisar(r.coordinador, index.empleados, "Empleado");
        revisar(r.programador, index.empleados, "Empleado");
        revisar(r.status, index.status, "Status");
        revisar(r.tenencia, index.tenencias, "Tenencia");
        revisar(r.smart?.bsp, index.bsps, "BSP");
        return { ...r, errores, nuevos };
      });
    },
    [index],
  );

  const reset = () => {
    setStep("upload");
    setRows([]);
    setLectura({ ignoradas: [], avisos: [] });
    setResultado(null);
    setFileName("");
    setError("");
    setImporting(false);
  };

  const handleClose = () => {
    if (importing) return;
    const creadas = resultado?.creadas ?? 0;
    const catalogosCreados = resultado?.catalogosCreados.length ?? 0;
    reset();
    onClose();
    if (creadas > 0) onDone(creadas, catalogosCreados);
  };

  const processFile = (file: File) => {
    setError("");
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError("Solo se aceptan archivos CSV (.csv o .txt)");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("El archivo supera el máximo de 5 MB.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result;
      if (!(buffer instanceof ArrayBuffer)) return;
      const { rows: parsed, ...info } = toRows(parseCsv(decodificar(buffer)));
      if (parsed.length === 0) {
        setError(
          "El archivo no contiene registros o no se reconoció la fila de encabezado (Numero, Cliente, Usuario, BSP, ...).",
        );
        return;
      }
      setLectura(info);
      setRows(validar(parsed));
      setStep("preview");
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const clienteExistente = clientes[0]?.nombre ?? "Cliente existente";
    const csv = [
      "# Plantilla de importación de líneas. Las filas que empiezan con # se ignoran.",
      "# Usa los mismos encabezados que las hojas «Cuentas Connectly» y «Control de Líneas» de Smart; también puedes subir esas hojas tal cual.",
      '# Solo "Numero" es obligatorio (también se acepta "Numero Connectly"). Todas las demás columnas son opcionales.',
      "# Cliente, status, coordinador, programador, tenencia y BSP se crean automáticamente si no existen.",
      "# Usuario a DNS crean la configuración Connectly y Estado a Facturado la de Smart, solo si la fila trae datos del módulo.",
      "# Envío de Push y Facturado: Sí o No. Fecha de Verificacion: DD/MM/AAAA o AAAA-MM-DD.",
      TEMPLATE_HEADER.join(";"),
      templateRow({ Numero: "573001234567" }),
      templateRow({
        Numero: "573009876543",
        Cliente: "Cliente Nuevo SAS",
        "Coordinador Asignado": "Nombre del coordinador",
      }),
      templateRow({
        Numero: "573112345678",
        Cliente: clienteExistente,
        "Descripcion Uso": "Atención al cliente",
        "Status Desarrollo": status[0]?.nombre ?? "Producción",
        Usuario: "usuario@empresa.com",
        Contraseña: "contraseña",
        "Business ID": "123456789",
      }),
      templateRow({
        Numero: "573212345678",
        Estado: "ACTIVO",
        "Tipo Activacion": "MIDDLEWARE - Ejemplo",
        BSP: bsps[0]?.nombre ?? "G",
        "Company BOT": "276",
        "BOT ID": "2343",
        "APP Channel": "237",
        "Envío de Push": "SI",
        "Fecha de Verificacion": "2/12/2025",
        Facturado: "SI",
      }),
    ].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_importacion_lineas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validas = rows.filter((r) => r.errores.length === 0);
  const invalidas = rows.filter((r) => r.errores.length > 0);
  // Un mismo nombre nuevo en varias filas se crea una sola vez.
  const nuevosTotal = new Set(
    validas.flatMap((r) => r.nuevos.map((n) => normalize(n))),
  ).size;

  const handleImport = async () => {
    setImporting(true);
    setError("");
    const acumulado: Resultado = {
      total: validas.length,
      creadas: 0,
      errores: [],
      catalogosCreados: [],
    };
    try {
      for (let i = 0; i < validas.length; i += MAX_FILAS_POR_ENVIO) {
        const lote = validas.slice(i, i + MAX_FILAS_POR_ENVIO);
        const res = await api.lineas.importar(
          lote.map(({ linea: _l, errores: _e, nuevos: _n, ...fila }) => fila),
        );
        acumulado.creadas += res.creadas;
        acumulado.catalogosCreados.push(...res.catalogosCreados);
        for (const err of res.errores) {
          acumulado.errores.push({
            linea: lote[err.fila - 1].linea,
            numero: err.numero,
            mensajes: err.mensajes,
          });
        }
      }
      setResultado(acumulado);
      setStep("result");
    } catch (e) {
      // Si un lote falló a mitad, lo ya creado se conserva: informarlo evita reimportar duplicados.
      setError(
        acumulado.creadas > 0
          ? `${errorMessage(e)} Se alcanzaron a crear ${acumulado.creadas} línea(s) antes del error; revisa la lista antes de reintentar.`
          : errorMessage(e),
      );
    } finally {
      setImporting(false);
    }
  };

  const creadosPorCatalogo = useMemo(() => {
    const grupos = new Map<string, string[]>();
    for (const c of resultado?.catalogosCreados ?? [])
      grupos.set(c.catalogo, [...(grupos.get(c.catalogo) ?? []), c.nombre]);
    return [...grupos.entries()];
  }, [resultado]);

  const footer =
    step === "upload" ? (
      <>
        <Button variant="outline" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <DownloadIcon /> Descargar plantilla
        </Button>
      </>
    ) : step === "preview" ? (
      <>
        <Button variant="outline" onClick={reset} disabled={importing}>
          ← Volver
        </Button>
        <Button
          variant="primary"
          disabled={validas.length === 0 || importing}
          onClick={handleImport}
        >
          {importing && <Spinner />}
          {importing
            ? "Importando..."
            : `Importar ${validas.length} línea${validas.length !== 1 ? "s" : ""}`}
        </Button>
      </>
    ) : (
      <Button variant="primary" onClick={handleClose}>
        Cerrar
      </Button>
    );

  return (
    <Modal
      title="Importación masiva de líneas"
      open={open}
      onClose={handleClose}
      footer={footer}
      wide={step !== "upload"}
    >
      {step === "upload" && (
        <div className="space-y-4">
          <div className="bg-[#e8f7f9] border border-[#3FB6C4]/30 rounded-lg p-4 text-sm text-[#2fa0ad]">
            <p className="font-semibold mb-1">Formato requerido (CSV)</p>
            <p className="text-xs leading-relaxed">
              Puedes subir directamente las hojas{" "}
              <strong>«Cuentas Connectly»</strong> y{" "}
              <strong>«Control de Líneas» de Smart</strong> exportadas a CSV
              desde Excel o Google Sheets (separadas por coma o punto y coma).
              Se reconocen sus encabezados (Numero Connectly, Status
              Desarrollo, Business ID, Tipo Activacion, APP Channel, …). Solo
              el <strong>número</strong> es obligatorio.
            </p>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-[#3FB6C4] bg-[#e8f7f9]"
                : "border-[#E2E8F0] bg-[#F8F9FA] hover:border-[#3FB6C4] hover:bg-[#e8f7f9]/40"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shadow-sm">
                <UploadIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#374151]">
                  {dragging
                    ? "Suelta el archivo aquí"
                    : "Arrastra tu archivo CSV aquí"}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  o haz clic para seleccionar · Máx. 5 MB
                </p>
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <InfoIcon />
            ¿Primera vez? Descarga la plantilla con el botón de abajo y llénala
            con tus datos.
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#DCFCE7] border border-[#16A34A]/20 rounded-lg px-4 py-2.5 text-center">
              <div className="text-xl font-bold text-[#15803D]">
                {validas.length}
              </div>
              <div className="text-xs text-[#16A34A]">Listas para importar</div>
            </div>
            {invalidas.length > 0 && (
              <div className="flex-1 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-lg px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-[#B91C1C]">
                  {invalidas.length}
                </div>
                <div className="text-xs text-[#DC2626]">
                  Con errores (se omitirán)
                </div>
              </div>
            )}
            <div className="flex-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-center">
              <div className="text-xl font-bold text-[#374151]">
                {rows.length}
              </div>
              <div className="text-xs text-[#64748B]">Total en archivo</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B] bg-[#F8F9FA] rounded-lg px-3 py-2">
            <CsvIcon />
            <span className="font-medium">{fileName}</span>
            <button
              onClick={reset}
              className="ml-auto text-[#3FB6C4] hover:underline"
            >
              Cambiar archivo
            </button>
          </div>

          {(lectura.avisos.length > 0 || lectura.ignoradas.length > 0) && (
            <div className="text-xs text-[#64748B] bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg px-3 py-2 space-y-1">
              {lectura.avisos.map((a) => (
                <p key={a} className="flex items-start gap-2">
                  <InfoIcon />
                  {a}
                </p>
              ))}
              {lectura.ignoradas.length > 0 && (
                <p className="flex items-start gap-2 text-[#B45309]">
                  <AlertIcon />
                  Columnas no reconocidas (no se importan):{" "}
                  {lectura.ignoradas.join(", ")}
                </p>
              )}
            </div>
          )}

          {nuevosTotal > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#3A7BC8] bg-[#EEF4FB] border border-[#3A7BC8]/20 rounded-lg px-3 py-2">
              <InfoIcon />
              Se crearán automáticamente {nuevosTotal} registro
              {nuevosTotal !== 1 ? "s" : ""} nuevo{nuevosTotal !== 1 ? "s" : ""}{" "}
              en los catálogos (marcados como «Nuevo»).
            </div>
          )}

          <div className="border border-[#E2E8F0] rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#F8F9FA] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Fila
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Número
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Cliente
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Módulos
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rows.map((row) => (
                  <tr
                    key={row.linea}
                    className={
                      row.errores.length === 0 ? "bg-white" : "bg-[#FFF7F7]"
                    }
                  >
                    <td className="px-3 py-2 text-[#94A3B8]">{row.linea}</td>
                    <td className="px-3 py-2 font-mono text-[#1A202C]">
                      {row.numero || <span className="text-[#DC2626]">—</span>}
                    </td>
                    <td className="px-3 py-2 text-[#374151]">
                      {row.cliente || <span className="text-[#94A3B8]">—</span>}
                      {row.nuevos.some((n) => n.startsWith("Cliente:")) && (
                        <span className="ml-1.5">
                          <Badge variant="secondary">Nuevo</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#374151]">
                      {row.status || <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {row.connectly && (
                          <Badge variant="primary">Connectly</Badge>
                        )}
                        {row.smart && <Badge variant="neutral">Smart</Badge>}
                        {!row.connectly && !row.smart && (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {row.errores.length > 0 ? (
                        <span
                          title={row.errores.join(" · ")}
                          className="inline-flex items-center gap-1 text-[#B91C1C] cursor-help"
                        >
                          <AlertIcon />
                          <span>
                            {row.errores[0]}
                            {row.errores.length > 1
                              ? ` (+${row.errores.length - 1})`
                              : ""}
                          </span>
                        </span>
                      ) : row.nuevos.length > 0 ? (
                        <span
                          title={`Se creará: ${row.nuevos.join(" · ")}`}
                          className="cursor-help"
                        >
                          <Badge variant="success">
                            OK · {row.nuevos.length} nuevo
                            {row.nuevos.length !== 1 ? "s" : ""}
                          </Badge>
                        </span>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidas.length > 0 && (
            <p className="text-xs text-[#94A3B8]">
              Las filas con errores no se importarán. Corrígelas en el archivo y
              vuelve a subirlo si las necesitas.
            </p>
          )}
        </div>
      )}

      {step === "result" && resultado && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#DCFCE7] border border-[#16A34A]/20 rounded-lg px-4 py-3 text-center">
              <div className="text-2xl font-bold text-[#15803D]">
                {resultado.creadas}
              </div>
              <div className="text-xs text-[#16A34A]">
                Línea{resultado.creadas !== 1 ? "s" : ""} creada
                {resultado.creadas !== 1 ? "s" : ""}
              </div>
            </div>
            {resultado.catalogosCreados.length > 0 && (
              <div className="flex-1 bg-[#EEF4FB] border border-[#3A7BC8]/20 rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#3A7BC8]">
                  {resultado.catalogosCreados.length}
                </div>
                <div className="text-xs text-[#3A7BC8]">
                  Registro{resultado.catalogosCreados.length !== 1 ? "s" : ""}{" "}
                  nuevo{resultado.catalogosCreados.length !== 1 ? "s" : ""} en
                  catálogos
                </div>
              </div>
            )}
            {resultado.errores.length > 0 && (
              <div className="flex-1 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#B91C1C]">
                  {resultado.errores.length}
                </div>
                <div className="text-xs text-[#DC2626]">
                  Rechazada{resultado.errores.length !== 1 ? "s" : ""} por el
                  servidor
                </div>
              </div>
            )}
          </div>

          {creadosPorCatalogo.length > 0 && (
            <div className="border border-[#E2E8F0] rounded-lg px-4 py-3 text-xs space-y-1 max-h-40 overflow-y-auto">
              <p className="font-semibold text-[#374151] mb-1">
                Creados automáticamente
              </p>
              {creadosPorCatalogo.map(([catalogo, nombres]) => (
                <p key={catalogo} className="text-[#64748B]">
                  <span className="font-medium text-[#374151]">
                    {catalogo}:
                  </span>{" "}
                  {nombres.join(", ")}
                </p>
              ))}
            </div>
          )}

          {resultado.errores.length > 0 && (
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#F8F9FA] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                      Fila
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                      Número
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                      Motivo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {resultado.errores.map((e) => (
                    <tr key={e.linea} className="bg-[#FFF7F7]">
                      <td className="px-3 py-2 text-[#94A3B8]">{e.linea}</td>
                      <td className="px-3 py-2 font-mono text-[#1A202C]">
                        {e.numero || "—"}
                      </td>
                      <td className="px-3 py-2 text-[#B91C1C]">
                        {e.mensajes.join(" ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Iconos ───────────────────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg
    className="w-6 h-6 text-[#94A3B8]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const AlertIcon = () => (
  <svg
    className="w-3.5 h-3.5 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const InfoIcon = () => (
  <svg
    className="w-3.5 h-3.5 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CsvIcon = () => (
  <svg
    className="w-3.5 h-3.5 text-[#3FB6C4]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
