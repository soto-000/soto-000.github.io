// ========== ELEMENTI HTML ==========
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var intro = document.getElementById('intro');
var gioco = document.getElementById('gioco');
var passioniSchermo = document.getElementById('passioni');
var capacitaSchermo = document.getElementById('capacita');
var iaSchermo = document.getElementById('ia');
var personaleSchermo = document.getElementById('personale');
var fineSchermo = document.getElementById('fine');
var colpitiSpan = document.getElementById('colpiti');
var video = document.getElementById('videoPresentazione');

// ========== VARIABILI GIOCO ==========
var GAME_W = 1000;
var GAME_H = 600;
var canvasScala = 1;

var giocatore = { x: 470, y: 520, w: 60, h: 60 };
var oggetti = [];
var proiettili = [];
var particelle = [];
var colpiti = 0;
var passioniOk = false;
var capacitaOk = false;
var iaOk = false;
var personaleOk = false;
var giocoAttivo = false;
var frame = 0;
var animazione;
var schermataAperta = false;

// ========== IMMAGINI ==========
var img = {
    sfondo: new Image(),
    personaggio: new Image(),
    passioni: new Image(),
    capacita: new Image(),
    ia: new Image(),
    personale: new Image()
};
img.sfondo.src = 'immagini/sfondo.jpg';
img.personaggio.src = 'immagini/personaggio.png';
img.passioni.src = 'immagini/passioni.png';
img.capacita.src = 'immagini/capacita.png';
img.ia.src = 'immagini/ia.png';
img.personale.src = 'immagini/personale.png';

// ========== DISEGNA IMMAGINE CON PROPORZIONI ORIGINALI ==========
// Disegna l'immagine centrata nel riquadro (x, y, w, h)
// mantenendo il rapporto larghezza/altezza originale (no deformazioni).
function drawImageFit(imgEl, x, y, boxW, boxH) {
    var natW = imgEl.naturalWidth;
    var natH = imgEl.naturalHeight;
    if (natW === 0 || natH === 0) return;

    var scala = Math.min(boxW / natW, boxH / natH);
    var dstW = natW * scala;
    var dstH = natH * scala;

    // Centra nel riquadro
    var offX = x + (boxW - dstW) / 2;
    var offY = y + (boxH - dstH) / 2;

    ctx.drawImage(imgEl, offX, offY, dstW, dstH);
}

// ========== SCALA CANVAS AD ALTA RISOLUZIONE ==========
function ridimensionaCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var scalaX = window.innerWidth  / GAME_W;
    var scalaY = window.innerHeight / GAME_H;
    canvasScala = Math.min(scalaX, scalaY);

    var cssW = Math.round(GAME_W * canvasScala);
    var cssH = Math.round(GAME_H * canvasScala);

    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.style.transform = 'translate(-50%, -50%)';

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
}

window.addEventListener('resize', ridimensionaCanvas);
ridimensionaCanvas();

// ========== CREA OGGETTI FISSI ==========
// Il riquadro (w, h) serve solo per le collisioni e il posizionamento.
// Il disegno rispetta le proporzioni reali dell'immagine.
function creaOggetti() {
    oggetti = [
        { x: 70,  y: 150, w: 120, h: 120, tipo: 'passioni',  nome: 'PASSIONI' },
        { x: 290, y: 150, w: 120, h: 120, tipo: 'capacita',  nome: 'CAPACITÀ' },
        { x: 510, y: 150, w: 120, h: 120, tipo: 'ia',        nome: 'IA' },
        { x: 730, y: 150, w: 120, h: 120, tipo: 'personale', nome: 'PERSONALE' }
    ];
}

// ========== INPUT TASTIERA ==========
var sinistra = false;
var destra = false;
var spazio = false;

document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') sinistra = true;
    if (e.key === 'ArrowRight') destra = true;
    if (e.key === ' ') {
        spazio = true;
        e.preventDefault();
        if (schermataAperta) chiudiInfo();
    }
});

document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft') sinistra = false;
    if (e.key === 'ArrowRight') destra = false;
    if (e.key === ' ') spazio = false;
});

// ========== CHIUDI SCHERMATA INFO ==========
function chiudiInfo() {
    passioniSchermo.classList.remove('attiva');
    capacitaSchermo.classList.remove('attiva');
    iaSchermo.classList.remove('attiva');
    personaleSchermo.classList.remove('attiva');

    if (video) {
        video.pause();
        video.currentTime = 0;
    }

    schermataAperta = false;

    if (colpiti >= 4) {
        giocoAttivo = false;
        cancelAnimationFrame(animazione);
        gioco.classList.remove('attiva');
        fineSchermo.classList.add('attiva');
        return;
    }

    gioco.classList.add('attiva');
    giocoAttivo = true;
    loop();
}

// ========== SPARA ==========
function spara() {
    proiettili.push({ x: giocatore.x + 26, y: giocatore.y, vy: -8 });
    for (var pi = 0; pi < 5; pi++) {
        particelle.push({
            x: giocatore.x + 30, y: giocatore.y,
            vx: (Math.random() - 0.5) * 3,
            vy: -2 - Math.random() * 3,
            vita: 1
        });
    }
}

// ========== ESPLOSIONE ==========
function esplosione(x, y) {
    for (var ei = 0; ei < 15; ei++) {
        particelle.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            vita: 1
        });
    }
}

// ========== AGGIORNAMENTO ==========
function aggiorna() {
    if (!giocoAttivo) return;

    if (sinistra && giocatore.x > 0)   giocatore.x -= 6;
    if (destra   && giocatore.x < 940) giocatore.x += 6;
    if (spazio   && frame % 10 === 0)  spara();

    for (var pi = proiettili.length - 1; pi >= 0; pi--) {
        proiettili[pi].y += proiettili[pi].vy;
        if (proiettili[pi].y < -20) proiettili.splice(pi, 1);
    }

    outer: for (var ci = proiettili.length - 1; ci >= 0; ci--) {
        var p = proiettili[ci];
        if (!p) continue;
        for (var oi = 0; oi < oggetti.length; oi++) {
            var o = oggetti[oi];
            if (o.tipo === 'passioni'  && passioniOk)  continue;
            if (o.tipo === 'capacita'  && capacitaOk)  continue;
            if (o.tipo === 'ia'        && iaOk)         continue;
            if (o.tipo === 'personale' && personaleOk)  continue;

            if (p.x < o.x + o.w && p.x + 8 > o.x &&
                p.y < o.y + o.h && p.y + 15 > o.y) {

                esplosione(o.x + o.w / 2, o.y + o.h / 2);
                proiettili.splice(ci, 1);

                if (o.tipo === 'passioni')  passioniOk  = true;
                if (o.tipo === 'capacita')  capacitaOk  = true;
                if (o.tipo === 'ia')        iaOk        = true;
                if (o.tipo === 'personale') personaleOk = true;

                colpiti++;
                colpitiSpan.textContent = colpiti;
                mostraInfo(o.tipo);
                continue outer;
            }
        }
    }

    for (var pai = particelle.length - 1; pai >= 0; pai--) {
        particelle[pai].x    += particelle[pai].vx;
        particelle[pai].y    += particelle[pai].vy;
        particelle[pai].vy   += 0.1;
        particelle[pai].vita -= 0.02;
        if (particelle[pai].vita <= 0) particelle.splice(pai, 1);
    }

    frame++;
}

// ========== DISEGNO ==========
function disegna() {
    var dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.scale(canvasScala * dpr, canvasScala * dpr);

    // Sfondo
    if (img.sfondo.complete && img.sfondo.naturalWidth > 0) {
        ctx.drawImage(img.sfondo, 0, 0, GAME_W, GAME_H);
    } else {
        var grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
        grad.addColorStop(0, '#0f0f1a');
        grad.addColorStop(1, '#1a1a3e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    // Oggetti — immagine con proporzioni reali, fallback cerchio colorato
    for (var oi = 0; oi < oggetti.length; oi++) {
        var o = oggetti[oi];
        if (o.tipo === 'passioni'  && passioniOk)  continue;
        if (o.tipo === 'capacita'  && capacitaOk)  continue;
        if (o.tipo === 'ia'        && iaOk)         continue;
        if (o.tipo === 'personale' && personaleOk)  continue;

        var imgObj = o.tipo === 'passioni' ? img.passioni :
                     o.tipo === 'capacita' ? img.capacita :
                     o.tipo === 'ia'       ? img.ia       : img.personale;
        var colore  = o.tipo === 'passioni' ? '#ff6b6b' :
                      o.tipo === 'capacita' ? '#4ecdc4' :
                      o.tipo === 'ia'       ? '#f39c12' : '#a78bfa';

        if (imgObj.complete && imgObj.naturalWidth > 0) {
            // *** PROPORZIONI ORIGINALI: niente deformazione ***
            drawImageFit(imgObj, o.x, o.y, o.w, o.h);
        } else {
            ctx.fillStyle = colore;
            ctx.beginPath();
            ctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(o.nome, o.x + o.w / 2, o.y - 10);
    }

    // Proiettili
    ctx.fillStyle = '#ffd700';
    for (var prd = 0; prd < proiettili.length; prd++) {
        ctx.fillRect(proiettili[prd].x, proiettili[prd].y, 8, 15);
    }

    // Personaggio — proporzioni originali
    if (img.personaggio.complete && img.personaggio.naturalWidth > 0) {
        drawImageFit(img.personaggio, giocatore.x, giocatore.y, giocatore.w, giocatore.h);
    } else {
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(giocatore.x, giocatore.y, giocatore.w, giocatore.h);
    }

    // Particelle
    for (var pai = 0; pai < particelle.length; pai++) {
        ctx.globalAlpha = particelle[pai].vita;
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(particelle[pai].x, particelle[pai].y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    if (giocoAttivo) {
        animazione = requestAnimationFrame(loop);
    }
}

function loop() {
    aggiorna();
    disegna();
}

// ========== MOSTRA SCHERMATA INFO ==========
function mostraInfo(tipo) {
    giocoAttivo = false;
    cancelAnimationFrame(animazione);
    gioco.classList.remove('attiva');

    if (tipo === 'passioni')       passioniSchermo.classList.add('attiva');
    else if (tipo === 'capacita')  capacitaSchermo.classList.add('attiva');
    else if (tipo === 'ia')        iaSchermo.classList.add('attiva');
    else if (tipo === 'personale') {
        personaleSchermo.classList.add('attiva');
        if (video) {
            video.currentTime = 0;
            video.muted = false;
            video.volume = 1.0;
            video.play().catch(function () {
                console.log('Clicca play per avviare il video');
            });
        }
    }

    schermataAperta = true;
}

// ========== RESET ==========
function reset() {
    giocatore.x = 470;
    proiettili = [];
    particelle = [];
    colpiti = 0;
    passioniOk  = false;
    capacitaOk  = false;
    iaOk        = false;
    personaleOk = false;
    frame = 0;
    schermataAperta = false;
    colpitiSpan.textContent = '0';
    creaOggetti();
    ridimensionaCanvas();
}

// ========== INIZIA GIOCO ==========
function iniziaGioco() {
    reset();
    intro.classList.remove('attiva');
    gioco.classList.add('attiva');
    giocoAttivo = true;
    loop();
}

// ========== COLLEGA BOTTONI ==========
document.getElementById('startBtn').onclick = iniziaGioco;
document.getElementById('rigiocaBtn').onclick = function () {
    fineSchermo.classList.remove('attiva');
    intro.classList.add('attiva');
};

// ========== INIZIALIZZA ==========
creaOggetti();
console.log('✅ Portfolio Endi Soto caricato!');