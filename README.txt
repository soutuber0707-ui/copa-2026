Este pacote usa uma fonte de placar online pública da Copa 2026 e uma Netlify Function para evitar bloqueio CORS.

Para funcionar:
1. Envie o ZIP inteiro para o Netlify.
2. Abra o site hospedado.
3. O HTML buscará /.netlify/functions/wc26-placares e atualizará os cards a cada 30 segundos.

Observação: tentar puxar diretamente da página visual da FIFA não funcionou porque ela não oferece JSON público estável para o navegador.
