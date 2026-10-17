// Lee lo que se suelta con arrastrar y soltar, entrando en las carpetas,
// y devuelve cada archivo con su ruta relativa: [{ file, path: "carpeta/archivo.ext" }]

export async function filesFromDrop(dt) {
  const out = [];
  const items = [...(dt.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!items.length) return [...dt.files].map(f => ({ file: f, path: f.name }));
  const walk = async (entry, prefix) => {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      out.push({ file, path: prefix + entry.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let batch;
      do {
        batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        for (const e of batch) await walk(e, prefix + entry.name + '/');
      } while (batch.length);
    }
  };
  for (const e of items) await walk(e, '');
  return out;
}
