'use strict';
// Unidades de tamaño y de tiempo, para escribir los límites de forma legible (15 * MIN, 3000 * MB...).

const MB = 1024 * 1024;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

module.exports = { MB, MIN, HOUR, DAY };
