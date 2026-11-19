# Controle Carrinho ESP — PWA Android + ESP32

Projeto reorganizado a partir dos arquivos enviados. O visual do cockpit foi mantido e os nomes/caminhos dos arquivos foram padronizados.

## Estrutura

```text
controle-carrinho-esp-revisado/
├── index.html
├── style.css
├── main.js
├── functions.js
├── config.js
├── manifest.json
├── service-worker.js
├── platformio.ini
├── assets/icons/icon-192.png
├── assets/icons/icon-512.png
├── firmware/src/main.cpp
├── firmware/include/
├── docs/PROXIMA-ETAPA-MOTORES.md
└── .vscode/extensions.json
```

A pasta `.pio/` é criada automaticamente pelo PlatformIO e não deve ser compartilhada no ZIP.

## O que já está preparado

- PWA com manifesto, ícones PNG quadrados, Service Worker e modo `standalone`.
- Botão próprio de instalação: chama o prompt do navegador quando ele disponibiliza `beforeinstallprompt`; caso contrário, mostra instruções.
- Interface horizontal com volante, acelerador e ré.
- Pointer Events para toque/mouse e controles por teclado no computador (W/S/A/D ou setas).
- WebSocket para `ws://192.168.4.1:81/`.
- Heartbeat a cada 150 ms, para o firmware reconhecer que o app continua ativo.
- Firmware ESP32 com ponto de acesso Wi-Fi e WebSocket.
- Mistura diferencial calculada para os dois motores e parada por timeout de aproximadamente 650 ms.

## Limite físico importante

**O firmware entregue NÃO aciona os motores fisicamente.** Os arquivos enviados não incluem um driver/ponte H de dois canais identificável. A saída física está desativada de propósito; o firmware somente calcula os valores dos motores esquerdo/direito e exibe esses valores no Monitor Serial.

Não ligue motores DC diretamente aos pinos da ESP32. Para movimentar o carrinho, será necessário um driver duplo compatível com a tensão/corrente dos motores e uma fonte adequada. O modelo exato deve ser identificado antes de escolher pinos ou habilitar PWM. Consulte `docs/PROXIMA-ETAPA-MOTORES.md`.

## Abrir no VS Code

1. Extraia o ZIP inteiro.
2. No VS Code, use **Arquivo > Abrir Pasta** e selecione a pasta `controle-carrinho-esp-revisado`.
3. Instale as recomendações: PlatformIO IDE e Live Server.
4. Não abra `index.html` com duplo clique (`file://`).

## Testar a interface no computador

1. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
2. O endereço local deve começar com `http://127.0.0.1` ou `http://localhost`.
3. O volante e os pedais podem ser testados sem ESP32; o status ficará desconectado.

## Programar a ESP32 pelo PlatformIO

1. Conecte a ESP32 por um cabo USB de dados.
2. No VS Code, abra **PlatformIO > Project Tasks > esp32dev**.
3. Execute **Build**.
4. Quando o Windows reconhecer a porta USB-serial, execute **Upload**.
5. Abra **Monitor** em 115200 baud.

O `platformio.ini` não fixa `COM5`, pois a porta pode mudar e o Windows já apresentou erro de driver Código 31. Se a placa ainda aparecer com Código 31, resolva primeiro o driver CP210x no Windows; não tente compensar isso mudando o firmware.

Saída esperada no Monitor Serial:

```text
Rede Wi-Fi criada.
SSID: Carrinho_ESP
IP da ESP32: 192.168.4.1
WebSocket ativo na porta 81.
MODO SEGURO: motores sem driver/saidas GPIO desativadas.
```

Senha Wi-Fi atualmente configurada: `12345678password`.

## Publicar e instalar o PWA no Android

PWA precisa ser servido por HTTPS (ou localhost apenas para desenvolvimento). Não basta copiar o HTML para o celular ou abrir o arquivo baixado.

1. Publique TODOS os arquivos desta pasta em uma hospedagem estática com HTTPS, mantendo a estrutura de pastas.
2. No Android, abra o endereço HTTPS no Chrome.
3. Aguarde o primeiro carregamento e o registro do Service Worker.
4. Use o botão **Instalar aplicativo** quando o Chrome oferecer o prompt; se ele não oferecer, abra o menu ⋮ e procure **Instalar app** ou **Adicionar à tela inicial**.
5. Abra pelo ícone instalado.

O botão não pode forçar a instalação. `beforeinstallprompt` só é entregue pelo navegador quando os critérios de instalação foram satisfeitos. O manifesto declara nome, start URL, display standalone e ícones 192/512.

## Conectar o celular à ESP32

1. Faça o primeiro carregamento/instalação do PWA enquanto o celular tem internet.
2. Ligue a ESP32 e conecte o celular à rede Wi-Fi `Carrinho_ESP`.
3. Se o Android avisar que a rede não tem internet, escolha permanecer conectado.
4. Abra o PWA instalado. Os recursos da interface devem vir do cache do Service Worker.
5. Quando o Chrome perguntar se o site pode procurar/conectar a dispositivos na rede local, permita o acesso.

O Chrome recente aplica a permissão de acesso à rede local também a conexões WebSocket `ws://` para IPs privados. Se a permissão for negada, o status permanece desconectado; ajuste a permissão do site no Chrome e tente de novo.

## Protocolo WebSocket

A interface envia texto simples:

```text
movimento:100
 direcao:0
```

Na prática, cada mensagem é enviada separadamente e o PWA repete o estado atual a cada 150 ms enquanto está aberto. O firmware aceita:

- `movimento:-100` até `movimento:100`
- `direcao:-90` até `direcao:90`

O firmware zera os alvos se deixar de receber comandos por cerca de 650 ms ou se o cliente desconectar.

## Testes realizados neste pacote

- Estrutura de pastas e caminhos internos padronizados.
- JSON do manifesto validado.
- Referências a HTML/CSS/JS/ícones verificadas.
- Sintaxe JavaScript verificada.

Não foi possível testar o upload na sua placa física nem validar a comunicação real no seu Android a partir daqui. A compilação final do firmware deve ser confirmada pelo PlatformIO no seu computador.
