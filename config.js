// Endereço do ponto de acesso criado pelo firmware da ESP32.
// A página PWA deve estar publicada em HTTPS; a conexão local usa WebSocket.
const CONFIG = Object.freeze({
  ESP_IP: '192.168.4.1',
  PORTA: 81,
  RECONNECT_MS: 3000,
  HEARTBEAT_MS: 150
});
