CAREER HUB — EAFC

Modo atual: 100% local/offline.

- Carreiras, jogadores, técnicos, temporadas, títulos, prêmios, histórico e mesa tática ficam no dispositivo.
- IndexedDB é o armazenamento principal; LocalStorage funciona como apoio.
- Fotos, escudos e imagens são armazenados como Data URL/Base64 quando adicionados pelo aplicativo.
- 📤 Exportar cria um JSON completo com os dados locais e as imagens incorporadas.
- 📥 Importar restaura o JSON completo e cria automaticamente um backup de segurança antes da troca.
- ↩️ Restaurar recupera o backup de segurança criado antes da última importação.
- Não há sincronização com Supabase, API de nuvem ou token de sincronização.
- Para levar os dados para outro dispositivo: exporte o JSON no dispositivo atual e importe o mesmo arquivo no outro.

O aplicativo continua hospedável no Vercel, mas o Vercel serve apenas os arquivos do aplicativo; os dados não são enviados para a nuvem.
