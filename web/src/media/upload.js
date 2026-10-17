// Subidas de archivos con barra de progreso. El archivo va tal cual en el cuerpo de la petición
// (sin convertirlo a texto), así se pueden subir vídeos grandes sin gastar memoria.

function xhrUpload(url, body, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data = {}; try { data = JSON.parse(xhr.responseText); } catch {}
      xhr.status < 300 ? resolve(data) : reject(new Error(data.error || 'No se pudo subir'));
    };
    xhr.onerror = () => reject(new Error('Se cortó la conexión'));
    xhr.send(body);
  });
}

// Foto o vídeo para una publicación: devuelve su dirección (/uploads/...)
export async function uploadMedia(blob, kind, onProgress) {
  return (await xhrUpload(`/api/media?kind=${kind}`, blob, onProgress)).url;
}

// Archivo de un proyecto en la ruta indicada (carpeta/archivo.ext): devuelve el archivo guardado
export async function uploadProjectFile(projectId, path, file, onProgress) {
  return (await xhrUpload(`/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`, file, onProgress)).file;
}
