// Fukushima — Art déco, stumm (Einstieg)
const cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['80px Limelight', '80px Poiret', '600 40px Josefin', '80px Italiana'].map(f => document.fonts.load(f)));
const film = await import('./film.js');
window.DUR = film.DUR; window.EV = [];
window.render = t => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; film.render(g, t); };
window.READY = true;
