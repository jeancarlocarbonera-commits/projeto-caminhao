let socket = null;
let timerReconexao = null;
let reconexaoAtiva = true;

function atualizarStatus(texto, estado = 'offline') {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  statusEl.textContent = texto;
  statusEl.className = `status-badge status-${estado}`;
}

function conectarWebSocket() {
  if (!reconexaoAtiva || document.hidden) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  if (timerReconexao) {
    clearTimeout(timerReconexao);
    timerReconexao = null;
  }

  atualizarStatus('Conectando…', 'connecting');
  const endereco = `ws://${CONFIG.ESP_IP}:${CONFIG.PORTA}/`;

  try {
    socket = new WebSocket(endereco);
  } catch (erro) {
    console.error('Falha ao iniciar WebSocket:', erro);
    atualizarStatus('Falha na conexão', 'offline');
    agendarReconexao();
    return;
  }

  socket.addEventListener('open', () => {
    atualizarStatus('ESP conectada', 'online');
    // Estado inicial sempre parado, inclusive após reconexão.
    enviarComando('movimento', 0);
    enviarComando('direcao', 0);
  });

  socket.addEventListener('message', (evento) => {
    if (typeof evento.data === 'string' && evento.data.startsWith('status:')) {
      console.info('ESP32:', evento.data);
    }
  });

  socket.addEventListener('error', (erro) => {
    console.warn('Erro no WebSocket. Confira a rede Carrinho_ESP e a permissão de rede local.', erro);
    atualizarStatus('Verifique Wi-Fi/permissão', 'offline');
  });

  socket.addEventListener('close', () => {
    atualizarStatus('Desconectado', 'offline');
    agendarReconexao();
  });
}

function agendarReconexao() {
  if (!reconexaoAtiva || document.hidden || timerReconexao) return;
  timerReconexao = setTimeout(() => {
    timerReconexao = null;
    conectarWebSocket();
  }, CONFIG.RECONNECT_MS);
}

function enviarComando(tipo, valor) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  try {
    socket.send(`${tipo}:${valor}`);
    return true;
  } catch (erro) {
    console.warn('Não foi possível enviar o comando:', erro);
    return false;
  }
}

function enviarEstadoControle(movimento, direcao) {
  enviarComando('movimento', movimento);
  enviarComando('direcao', direcao);
}

function pausarConexao() {
  reconexaoAtiva = false;
  if (timerReconexao) {
    clearTimeout(timerReconexao);
    timerReconexao = null;
  }
  enviarEstadoControle(0, 0);
  if (socket) {
    const conexao = socket;
    socket = null;
    try { conexao.close(); } catch (erro) { console.debug(erro); }
  }
  atualizarStatus('Pausado', 'offline');
}

function reativarConexao() {
  reconexaoAtiva = true;
  conectarWebSocket();
}

function encerrarConexao() {
  enviarEstadoControle(0, 0);
}
