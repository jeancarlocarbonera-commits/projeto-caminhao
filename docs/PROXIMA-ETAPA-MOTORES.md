# Próxima etapa: acionar os dois motores

## Estado atual

O firmware cria o Wi-Fi `Carrinho_ESP`, recebe `movimento` e `direcao` pelo WebSocket, calcula alvos diferenciais para motor esquerdo e direito e imprime esses valores no Monitor Serial.

**As saídas físicas dos motores estão desativadas intencionalmente.** O material enviado mostra a ESP32 e motores DC, mas não mostra um driver de dupla ponte H. A ESP32 não deve alimentar os motores diretamente pelos GPIOs.

## O que falta confirmar

1. Modelo exato do driver duplo de motores (a placa/módulo que liga os motores à ESP32).
2. Fonte/bateria compatível com os motores e com o driver.
3. Tensão nominal dos motores e corrente exigida.
4. Identificação dos pinos disponíveis na placa ESP32.

Só depois disso serão definidos os GPIOs de direção e PWM, a frequência e resolução PWM, a lógica de frenagem e o limite de velocidade.

## Mistura diferencial planejada

- Pedal de aceleração: `movimento` entre 0 e 100.
- Pedal de ré: `movimento` entre 0 e -100.
- Volante: `direcao` entre -90 e 90.
- Volante centralizado: os dois motores recebem o mesmo alvo.
- Volante para um lado: reduz a velocidade relativa de um motor e aumenta a do outro.
- Perda do heartbeat/conexão: alvo dos dois motores volta a zero em aproximadamente 650 ms.

Não altere a função `aplicarAlvosAoDriver()` para ligar GPIOs sem confirmar o driver e a alimentação.
