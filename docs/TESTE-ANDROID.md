# Checklist de teste Android

- [ ] O PWA foi aberto uma vez pelo endereço HTTPS.
- [ ] O Service Worker aparece como registrado.
- [ ] O Android mostra a opção de instalar/adicionar à tela inicial.
- [ ] O aplicativo abre em janela standalone.
- [ ] O celular está conectado ao Wi-Fi `Carrinho_ESP`.
- [ ] O aviso do Android para permanecer na rede sem internet foi aceito.
- [ ] A permissão de rede local do Chrome foi permitida, se solicitada.
- [ ] O status do cockpit mostra `ESP conectada`.
- [ ] Ao pressionar e soltar os pedais, o Monitor Serial mostra `movimento:100`, `movimento:-100` e `movimento:0`.
- [ ] Ao girar e soltar o volante, o Monitor Serial mostra `direcao` entre -90 e 90 e depois 0.
- [ ] Ao fechar/suspender o app, o firmware registra parada por desconexão ou timeout.

**Não teste motores até existir driver duplo identificado e alimentação adequada.**
