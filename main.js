document.addEventListener('DOMContentLoaded', () => {
  const btnAcelerar = document.getElementById('btn-acelerador');
  const btnRe = document.getElementById('btn-re');
  const displayVel = document.getElementById('val-velocidade');
  const volante = document.getElementById('volante');
  const volanteArea = document.querySelector('.steering-wrapper');
  const displayDir = document.getElementById('val-direcao');
  const btnInstalar = document.getElementById('btn-instalar');
  const installHelp = document.getElementById('install-help');
  const installMessage = document.getElementById('install-message');
  const btnFecharAjuda = document.getElementById('btn-fechar-ajuda');

  let movimentoAtual = 0;
  let anguloAtual = 0;
  let eventoInstalacao = null;
  let arrastandoVolante = false;
  let pointerVolanteId = null;
  let anguloInicialPonteiro = 0;
  let pedalAtivo = null;
  let pointerPedalId = null;
  const teclasPressionadas = Object.create(null);

  // --- PWA / INSTALAÇÃO ---
  const instaladoComoApp = () =>
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  if (instaladoComoApp()) btnInstalar.classList.add('hidden');

  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    eventoInstalacao = evento;
    if (!instaladoComoApp()) btnInstalar.classList.remove('hidden');
  });

  function mostrarAjudaInstalacao() {
    if (location.protocol === 'file:' || (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1')) {
      installMessage.textContent = 'Este projeto precisa estar publicado em um endereço HTTPS para ser instalado. Abrir o arquivo HTML baixado não instala um PWA.';
    } else if (instaladoComoApp()) {
      installMessage.textContent = 'O Controle Carrinho ESP já está instalado neste dispositivo.';
    } else {
      installMessage.textContent = 'No Android, abra este endereço HTTPS no Chrome. Use o menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”. O botão de instalação do site aparece quando o Chrome libera o evento de instalação. O navegador sempre pede sua confirmação.';
    }
    installHelp.classList.remove('hidden');
  }

  btnInstalar.addEventListener('click', async () => {
    if (!eventoInstalacao) {
      mostrarAjudaInstalacao();
      return;
    }
    eventoInstalacao.prompt();
    const escolha = await eventoInstalacao.userChoice;
    if (escolha.outcome === 'accepted') btnInstalar.classList.add('hidden');
    eventoInstalacao = null;
  });

  btnFecharAjuda.addEventListener('click', () => installHelp.classList.add('hidden'));
  installHelp.addEventListener('click', (evento) => {
    if (evento.target === installHelp) installHelp.classList.add('hidden');
  });
  window.addEventListener('appinstalled', () => {
    btnInstalar.classList.add('hidden');
    eventoInstalacao = null;
  });

  // Registra o Service Worker somente em contexto seguro (HTTPS ou localhost).
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .then(() => console.info('PWA: Service Worker registrado.'))
      .catch((erro) => console.error('Falha ao registrar Service Worker:', erro));
  }

  // --- CONTROLES ---
  function atualizarMovimento(valor) {
    movimentoAtual = Math.max(-100, Math.min(100, Math.round(valor)));
    displayVel.textContent = `${movimentoAtual}%`;
  }

  function atualizarVolanteVisual(angulo) {
    anguloAtual = Math.max(-90, Math.min(90, Math.round(angulo)));
    volante.style.transform = `rotate(${anguloAtual}deg)`;
    volante.setAttribute('aria-valuenow', String(anguloAtual));
    displayDir.textContent = `${anguloAtual}°`;
  }

  function ativarVisualPedal(tipo) {
    btnAcelerar.classList.toggle('pedal-ativo', tipo === 'frente');
    btnRe.classList.toggle('pedal-ativo', tipo === 're');
  }

  // Um único pedal pode estar ativo por vez. Soltar/cancelar sempre para.
  function configurarPedal(elemento, valor, tipo) {
    elemento.addEventListener('contextmenu', (evento) => evento.preventDefault());
    elemento.addEventListener('pointerdown', (evento) => {
      if (pointerPedalId !== null) return;
      if (evento.pointerType === 'mouse' && evento.button !== 0) return;
      evento.preventDefault();
      pointerPedalId = evento.pointerId;
      pedalAtivo = tipo;
      elemento.setPointerCapture(evento.pointerId);
      atualizarMovimento(valor);
      ativarVisualPedal(tipo);
    });

    const soltar = (evento) => {
      if (evento.pointerId !== pointerPedalId) return;
      pointerPedalId = null;
      pedalAtivo = null;
      atualizarMovimento(0);
      ativarVisualPedal(null);
    };

    elemento.addEventListener('pointerup', soltar);
    elemento.addEventListener('pointercancel', soltar);
    elemento.addEventListener('lostpointercapture', soltar);
  }

  configurarPedal(btnAcelerar, 100, 'frente');
  configurarPedal(btnRe, -100, 're');

  function obterAnguloDoPonteiro(evento) {
    const retangulo = volanteArea.getBoundingClientRect();
    const centroX = retangulo.left + retangulo.width / 2;
    const centroY = retangulo.top + retangulo.height / 2;
    return Math.atan2(evento.clientY - centroY, evento.clientX - centroX) * (180 / Math.PI);
  }

  function iniciarGiro(evento) {
    if (evento.pointerType === 'mouse' && evento.button !== 0) return;
    evento.preventDefault();
    arrastandoVolante = true;
    pointerVolanteId = evento.pointerId;
    volante.setPointerCapture(evento.pointerId);
    anguloInicialPonteiro = obterAnguloDoPonteiro(evento) - anguloAtual;
  }

  function girar(evento) {
    if (!arrastandoVolante || evento.pointerId !== pointerVolanteId) return;
    evento.preventDefault();
    let novoAngulo = obterAnguloDoPonteiro(evento) - anguloInicialPonteiro;
    while (novoAngulo > 180) novoAngulo -= 360;
    while (novoAngulo < -180) novoAngulo += 360;
    atualizarVolanteVisual(novoAngulo);
  }

  function soltarVolante(evento) {
    if (!arrastandoVolante || (evento && evento.pointerId !== pointerVolanteId)) return;
    arrastandoVolante = false;
    pointerVolanteId = null;
    atualizarVolanteVisual(0);
  }

  volante.addEventListener('pointerdown', iniciarGiro);
  volante.addEventListener('pointermove', girar);
  volante.addEventListener('pointerup', soltarVolante);
  volante.addEventListener('pointercancel', soltarVolante);
  volante.addEventListener('lostpointercapture', soltarVolante);

  // Teclado para testar no computador: W/S acelera/re; A/D esterça.
  function processarTeclado() {
    const frente = Boolean(teclasPressionadas.w || teclasPressionadas.W || teclasPressionadas.ArrowUp);
    const re = Boolean(teclasPressionadas.s || teclasPressionadas.S || teclasPressionadas.ArrowDown);
    if (frente && !re) {
      atualizarMovimento(100);
      ativarVisualPedal('frente');
    } else if (re && !frente) {
      atualizarMovimento(-100);
      ativarVisualPedal('re');
    } else if (!pedalAtivo) {
      atualizarMovimento(0);
      ativarVisualPedal(null);
    }

    if (!arrastandoVolante) {
      if (teclasPressionadas.a || teclasPressionadas.A || teclasPressionadas.ArrowLeft) atualizarVolanteVisual(-90);
      else if (teclasPressionadas.d || teclasPressionadas.D || teclasPressionadas.ArrowRight) atualizarVolanteVisual(90);
      else atualizarVolanteVisual(0);
    }
  }

  document.addEventListener('keydown', (evento) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(evento.key)) evento.preventDefault();
    if (!teclasPressionadas[evento.key]) {
      teclasPressionadas[evento.key] = true;
      processarTeclado();
    }
  });
  document.addEventListener('keyup', (evento) => {
    teclasPressionadas[evento.key] = false;
    processarTeclado();
  });

  function pararControles() {
    arrastandoVolante = false;
    pointerVolanteId = null;
    pointerPedalId = null;
    pedalAtivo = null;
    Object.keys(teclasPressionadas).forEach((tecla) => { teclasPressionadas[tecla] = false; });
    atualizarMovimento(0);
    atualizarVolanteVisual(0);
    ativarVisualPedal(null);
    encerrarConexao();
  }

  // Heartbeat obrigatório: o firmware para sozinho se deixar de receber comandos.
  window.setInterval(() => {
    enviarEstadoControle(movimentoAtual, anguloAtual);
  }, CONFIG.HEARTBEAT_MS);

  window.addEventListener('blur', pararControles);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pararControles();
      pausarConexao();
    } else {
      reativarConexao();
    }
  });
  window.addEventListener('pagehide', pararControles);

  // Começa parado e tenta conectar à ESP32.
  atualizarMovimento(0);
  atualizarVolanteVisual(0);
  conectarWebSocket();
});
