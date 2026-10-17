// Qué archivos se pueden ver dentro de la web (texto/código e imágenes).
export const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'log',
  'c', 'h', 'cpp', 'hpp', 'cc', 'ino', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'java', 'kt', 'cs', 'go', 'rs',
  'rb', 'php', 'sh', 'bat', 'ps1', 'sql', 'm', 'r', 'lua', 'v', 'vhd', 'vhdl', 'gcode', 'nc', 'scad', 'tex', 'svg']);
export const IMG_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
export const extOf = name => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
