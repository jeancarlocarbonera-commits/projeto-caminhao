#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <math.h>
#include <stdlib.h>

// Rede local criada pela ESP32. O celular deve se conectar a ela.
static const char *WIFI_SSID = "Carrinho_ESP";
static const char *WIFI_PASSWORD = "12345678password";
static constexpr uint16_t WEBSOCKET_PORT = 81;
static constexpr uint32_t COMMAND_TIMEOUT_MS = 650;

WebSocketsServer webSocket(WEBSOCKET_PORT);

// Valores recebidos do PWA. Faixas: movimento [-100, 100], direcao [-90, 90].
volatile int movimentoPercentual = 0;
volatile int direcaoGraus = 0;
uint32_t ultimoComandoMs = 0;
bool clienteConectado = false;
bool recebeuComando = false;

struct MotorTargets {
  float esquerdo;
  float direito;
};

static int limitar(int valor, int minimo, int maximo) {
  if (valor < minimo) return minimo;
  if (valor > maximo) return maximo;
  return valor;
}

// Mistura acelerador + volante para direção diferencial (dois motores).
// Com volante centralizado, ambos recebem a mesma potência.
// Ao esterçar, a velocidade relativa dos motores muda.
MotorTargets calcularAlvosDosMotores(int movimento, int direcao) {
  const float acelerador = limitar(movimento, -100, 100) / 100.0f;
  const float esterco = limitar(direcao, -90, 90) / 90.0f;

  const float curva = fabsf(acelerador) * esterco;
  float esquerdo = acelerador + curva;
  float direito = acelerador - curva;

  const float pico = fmaxf(fabsf(esquerdo), fabsf(direito));
  if (pico > 1.0f) {
    esquerdo /= pico;
    direito /= pico;
  }

  MotorTargets alvos;
  alvos.esquerdo = esquerdo * 100.0f;
  alvos.direito = direito * 100.0f;
  return alvos;
}

// ATENÇÃO: esta função fica intencionalmente sem saídas GPIO/PWM.
// A placa e os motores mostrados não incluem um driver de dupla ponte H visível.
// Nunca ligue motor DC diretamente a um GPIO da ESP32.
// Depois de identificar/instalar o driver correto, esta função será implementada
// especificamente para o modelo e para a alimentação utilizados.
void aplicarAlvosAoDriver(float motorEsquerdo, float motorDireito) {
  (void)motorEsquerdo;
  (void)motorDireito;
  // Saídas de motor desativadas até haver driver identificado e conectado.
}

void imprimirAlvos() {
  const MotorTargets alvos = calcularAlvosDosMotores(movimentoPercentual, direcaoGraus);
  Serial.printf(
    "Comandos: acelerador=%d%% volante=%d graus | alvo motor esquerdo=%.0f%% direito=%.0f%%\n",
    movimentoPercentual,
    direcaoGraus,
    alvos.esquerdo,
    alvos.direito
  );
  aplicarAlvosAoDriver(alvos.esquerdo, alvos.direito);
}

void pararCarrinho(const char *motivo) {
  const bool estavaEmMovimento = (movimentoPercentual != 0 || direcaoGraus != 0);
  movimentoPercentual = 0;
  direcaoGraus = 0;
  if (estavaEmMovimento) {
    Serial.printf("PARADA DE SEGURANCA: %s\n", motivo);
    imprimirAlvos();
  }
}

bool processarMensagem(uint8_t numeroCliente, uint8_t *payload, size_t tamanho) {
  if (tamanho == 0 || tamanho > 80) return false;

  String mensagem;
  mensagem.reserve(tamanho + 1);
  for (size_t i = 0; i < tamanho; i++) {
    mensagem += static_cast<char>(payload[i]);
  }
  mensagem.trim();

  const int separador = mensagem.indexOf(':');
  if (separador <= 0 || separador >= static_cast<int>(mensagem.length()) - 1) return false;

  const String tipo = mensagem.substring(0, separador);
  const String textoValor = mensagem.substring(separador + 1);
  char *fim = nullptr;
  const long valorLongo = strtol(textoValor.c_str(), &fim, 10);
  if (fim == textoValor.c_str() || *fim != '\0') return false;

  const int valor = static_cast<int>(valorLongo);
  if (tipo == "movimento") {
    movimentoPercentual = limitar(valor, -100, 100);
  } else if (tipo == "direcao") {
    direcaoGraus = limitar(valor, -90, 90);
  } else {
    return false;
  }

  ultimoComandoMs = millis();
  recebeuComando = true;
  imprimirAlvos();
  webSocket.sendTXT(numeroCliente, "status:comando_recebido");
  return true;
}

void eventoWebSocket(uint8_t numeroCliente, WStype_t tipo, uint8_t *payload, size_t tamanho) {
  switch (tipo) {
    case WStype_CONNECTED:
      clienteConectado = true;
      recebeuComando = false;
      pararCarrinho("novo cliente conectado");
      Serial.printf("PWA conectado: cliente %u - %s\n",
                    numeroCliente,
                    webSocket.remoteIP(numeroCliente).toString().c_str());
      webSocket.sendTXT(numeroCliente, "status:esp_pronta_sem_driver_de_motor");
      break;

    case WStype_DISCONNECTED:
      Serial.printf("PWA desconectado: cliente %u\n", numeroCliente);
      clienteConectado = false;
      recebeuComando = false;
      pararCarrinho("cliente desconectado");
      break;

    case WStype_TEXT:
      if (!processarMensagem(numeroCliente, payload, tamanho)) {
        Serial.println("Mensagem ignorada: formato desconhecido.");
      }
      break;

    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("========================================");
  Serial.println(" CONTROLE CARRINHO ESP - FIRMWARE TESTE");
  Serial.println("========================================");

  WiFi.mode(WIFI_AP);
  WiFi.setSleep(false);
  const bool redeCriada = WiFi.softAP(WIFI_SSID, WIFI_PASSWORD);
  if (!redeCriada) {
    Serial.println("ERRO: nao foi possivel criar a rede Wi-Fi.");
    return;
  }

  Serial.println("Rede Wi-Fi criada.");
  Serial.printf("SSID: %s\n", WIFI_SSID);
  Serial.printf("Senha: %s\n", WIFI_PASSWORD);
  Serial.print("IP da ESP32: ");
  Serial.println(WiFi.softAPIP());

  webSocket.begin();
  webSocket.onEvent(eventoWebSocket);
  Serial.printf("WebSocket ativo na porta %u.\n", WEBSOCKET_PORT);
  Serial.println("MODO SEGURO: motores sem driver/saidas GPIO desativadas.");
  Serial.println("Os valores dos dois motores serao apenas calculados no Monitor Serial.");
}

void loop() {
  webSocket.loop();

  if (clienteConectado && recebeuComando && (millis() - ultimoComandoMs > COMMAND_TIMEOUT_MS)) {
    recebeuComando = false;
    pararCarrinho("tempo limite sem comandos do PWA");
  }

  delay(2);
}
