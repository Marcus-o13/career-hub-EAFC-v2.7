CAREER HUB — EAFC

Modo atual: 100% local/offline.

- Carreiras, jogadores, técnicos, temporadas, títulos, prêmios, histórico e mesa tática ficam no dispositivo.
- IndexedDB é o armazenamento principal; LocalStorage funciona como apoio.
- Fotos, escudos e imagens são armazenados como Data URL/Base64 quando adicionados pelo aplicativo.
- 📤 Exportar cria um JSON completo com os dados locais e as imagens incorporadas.
- 📥 Importar restaura o JSON priorizando IndexedDB para suportar backups grandes no Safari/iPhone. Mantenha o arquivo original como cópia de segurança.
- ↩️ Restaurar recupera o backup de segurança criado antes da última importação.
- Não há sincronização com Supabase, API de nuvem ou token de sincronização.
- Para levar os dados para outro dispositivo: exporte o JSON no dispositivo atual e importe o mesmo arquivo no outro.

O aplicativo continua hospedável no Vercel, mas o Vercel serve apenas os arquivos do aplicativo; os dados não são enviados para a nuvem.


IMPORTANTE SOBRE ESPAÇO:
- O aplicativo offline usa o armazenamento permitido pelo navegador/dispositivo; não existe configuração que transforme o Safari em armazenamento ilimitado ou garanta gigabytes.
- O importador mostra uma estimativa de espaço quando o navegador fornece essa informação, mas a estimativa não garante sucesso.
- Para grandes volumes (centenas de MB/GB) é necessário testar em cada dispositivo; a solução robusta é armazenamento externo/nuvem ou uma aplicação nativa com gestão de ficheiros.
- Testes automatizados de sintaxe/ZIP não substituem um teste real no iPhone.
