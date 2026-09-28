// Fukushima — 1920er Stummfilm (Einstieg)
const cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['400 40px "Old Standard TT"', 'italic 400 40px "Old Standard TT"', '900 40px "Playfair Display SC"', '700 40px "Playfair Display SC"'].map(f => document.fonts.load(f)));
const film = await import('./film.js');
window.DUR = film.DUR; window.EV = film.events();
window.render = t => { g.setTransform(1, 0, 0, 1, 0, 0); film.renderFilm(g, t); };
window.READY = true;
