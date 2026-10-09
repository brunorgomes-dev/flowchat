export default function PaginaInicial({ contatos, mensagens, logs }) {
    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-2xl font-bold mb-6">FlowChat</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="bg-white rounded-lg shadow p-4">
                    <h2 className="font-semibold mb-3">Contatos</h2>
                    <ul className="space-y-2 text-sm">
                        {contatos.map((contato) => (
                            <li key={contato.id} className="border-b pb-2">
                                <span className="font-medium">{contato.nome ?? contato.psid}</span>
                                <span className="text-gray-500"> — {contato.mensagens_count} mensagens</span>
                            </li>
                        ))}
                        {contatos.length === 0 && <li className="text-gray-400">Nenhum contato ainda.</li>}
                    </ul>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                    <h2 className="font-semibold mb-3">Mensagens recentes</h2>
                    <ul className="space-y-2 text-sm">
                        {mensagens.map((mensagem) => (
                            <li key={mensagem.id} className="border-b pb-2">
                                <span className={mensagem.direcao === 'enviada' ? 'text-blue-600' : 'text-green-600'}>
                                    {mensagem.direcao === 'enviada' ? 'Enviada' : 'Recebida'}
                                </span>
                                <span className="text-gray-500"> para {mensagem.contato?.nome ?? mensagem.contato?.psid}</span>
                                <p>{mensagem.texto}</p>
                            </li>
                        ))}
                        {mensagens.length === 0 && <li className="text-gray-400">Nenhuma mensagem ainda.</li>}
                    </ul>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                    <h2 className="font-semibold mb-3">Logs</h2>
                    <ul className="space-y-2 text-sm">
                        {logs.map((log) => (
                            <li key={log.id} className="border-b pb-2">
                                <span className="font-medium">{log.evento}</span>
                                <p className="text-gray-500">{log.descricao}</p>
                                <p className="text-gray-400 text-xs">
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                </p>
                            </li>
                        ))}
                        {logs.length === 0 && <li className="text-gray-400">Nenhum log ainda.</li>}
                    </ul>
                </section>
            </div>
        </div>
    );
}
