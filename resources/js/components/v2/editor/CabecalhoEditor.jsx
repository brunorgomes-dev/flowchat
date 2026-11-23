import { Link } from '@inertiajs/react';
import { ArrowLeft, Check } from 'lucide-react';
import { gatilhos, opcoesForaHorario } from '@/components/v2/editor/util';
import { Interruptor } from '@/components/v2/editor/Interruptor';

/**
 * Cabeçalho do editor: título, nome do fluxo, gatilhos de início e janela de
 * horário permitida.
 */
export default function CabecalhoEditor({
    criando,
    nome,
    erros,
    aoAlterarNome,
    ativo,
    aoAlternarAtivo,
    gatilhosAtivos,
    aoAlterarGatilho,
    horario,
    aoAlterarHorario,
}) {
    return (
        <>
            <header className="v2-editor-fluxo__cabecalho">
                <div>
                    <h1 className="v2-editor-fluxo__titulo">
                        <Link href="/fluxos">Fluxos</Link>
                        {' / '}
                        {criando ? 'Novo fluxo' : 'Editar fluxo'}
                    </h1>
                    <p className="v2-descricao-pagina">
                        Monte a sequência de mensagens e configure como este fluxo é iniciado.
                    </p>
                </div>
                <div className="v2-editor-fluxo__cabecalho-acoes">
                    <Link href="/fluxos" className="v2-btn v2-btn--contorno">
                        <ArrowLeft />
                        Voltar à central
                    </Link>
                </div>
            </header>

            <section className="v2-painel v2-editor-fluxo__painel">
                <div className="v2-editor-fluxo__painel-corpo">
                    <div className="v2-editor-fluxo__campo-linha v2-editor-fluxo__campo-linha--nome">
                        <label className="v2-campo" style={{ flex: 1 }}>
                            <span className="v2-campo__rotulo">Nome do fluxo</span>
                            <input
                                type="text"
                                value={nome}
                                onChange={(evento) => aoAlterarNome(evento.target.value)}
                                aria-invalid={Boolean(erros.nome)}
                                className="v2-entrada"
                            />
                            {erros.nome && <span role="alert" className="v2-campo__erro">{erros.nome}</span>}
                        </label>
                        <div className="v2-editor-fluxo__campo-ativo">
                            <span className="v2-campo__rotulo" aria-hidden="true">{'\u00A0'}</span>
                            <Interruptor
                                id="fluxo-ativo"
                                checked={ativo}
                                onCheckedChange={aoAlternarAtivo}
                                titulo="Fluxo ativo"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="v2-painel v2-editor-fluxo__painel">
                <div className="v2-editor-fluxo__painel-corpo">
                    <div className="v2-editor-fluxo__secao-cabecalho">
                        <div>
                            <h2 className="v2-editor-fluxo__secao-titulo">Início do fluxo</h2>
                            <p className="v2-editor-fluxo__secao-nota">Escolha os gatilhos que iniciam este fluxo automaticamente quando chega uma mensagem.</p>
                        </div>
                    </div>
                    <fieldset className="v2-editor-fluxo__grupo-botoes">
                        <legend className="v2-oculto-visual">Gatilhos que iniciam o fluxo</legend>
                        {gatilhos.map((gatilho) => {
                            const gatilhoAtivo = Boolean(gatilhosAtivos[gatilho.valor]);

                            return (
                                <button
                                    key={gatilho.valor}
                                    type="button"
                                    aria-pressed={gatilhoAtivo}
                                    onClick={() => aoAlterarGatilho(gatilho.valor)}
                                    className="v2-editor-fluxo__botao-gatilho"
                                >
                                    <span className="v2-editor-fluxo__caixa-marcacao" aria-hidden="true">
                                        {gatilhoAtivo && <Check style={{ width: '0.75rem', height: '0.75rem' }} />}
                                    </span>
                                    {gatilho.rotulo}
                                </button>
                            );
                        })}
                    </fieldset>
                </div>
            </section>

            <section className="v2-painel v2-editor-fluxo__painel">
                <div className="v2-editor-fluxo__painel-corpo">
                    <div className="v2-editor-fluxo__secao-cabecalho">
                        <div>
                            <h2 className="v2-editor-fluxo__secao-titulo">Horário de início</h2>
                            <p className="v2-editor-fluxo__secao-nota">Opcional: quando ativado, mensagens recebidas só iniciam este fluxo dentro da janela permitida.</p>
                        </div>
                        <Interruptor
                            id="horario-inicio-ativo"
                            checked={horario.ativo}
                            onCheckedChange={(verificado) => aoAlterarHorario('ativo', verificado)}
                            titulo="Ativar horário"
                        />
                    </div>

                    {horario.ativo && (
                        <div className="v2-editor-fluxo__grupo">
                            <div className="v2-editor-fluxo__condicao-campos v2-editor-fluxo__condicao-campos--duas">
                                <label className="v2-campo">
                                    <span className="v2-campo__rotulo">Início permitido</span>
                                    <input
                                        type="time"
                                        step={60}
                                        value={horario.inicio}
                                        onChange={(evento) => aoAlterarHorario('inicio', evento.target.value)}
                                        aria-invalid={Boolean(erros.horario)}
                                        className="v2-entrada v2-numerico"
                                    />
                                </label>
                                <label className="v2-campo">
                                    <span className="v2-campo__rotulo">Fim permitido</span>
                                    <input
                                        type="time"
                                        step={60}
                                        value={horario.fim}
                                        onChange={(evento) => aoAlterarHorario('fim', evento.target.value)}
                                        aria-invalid={Boolean(erros.horario)}
                                        className="v2-entrada v2-numerico"
                                    />
                                </label>
                            </div>
                            <p className="v2-campo__ajuda">
                                Formato de 24 horas, com limites inclusivos. Suporta janelas que atravessam a meia-noite (ex.: 22:00 às 06:00).
                            </p>
                            <fieldset className="v2-campo">
                                <legend className="v2-campo__rotulo">Quando uma mensagem chega fora do horário</legend>
                                <div className="v2-editor-fluxo__condicao-campos v2-editor-fluxo__condicao-campos--duas">
                                    {opcoesForaHorario.map((opcao) => {
                                        const selecionada = horario.fora_horario === opcao.valor;

                                        return (
                                            <button
                                                key={opcao.valor}
                                                type="button"
                                                aria-pressed={selecionada}
                                                onClick={() => aoAlterarHorario('fora_horario', opcao.valor)}
                                                className="v2-editor-fluxo__botao-opcao"
                                            >
                                                <span className="v2-editor-fluxo__botao-opcao-titulo">
                                                    <span className="v2-editor-fluxo__caixa-marcacao" aria-hidden="true">
                                                        {selecionada && <span className="v2-oculto-visual">Selecionado</span>}
                                                    </span>
                                                    {opcao.rotulo}
                                                </span>
                                                <span className="v2-editor-fluxo__botao-opcao-descricao">{opcao.descricao}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>
                        </div>
                    )}

                    {erros.horario && (
                        <p role="alert" className="v2-campo__erro">{erros.horario}</p>
                    )}
                </div>
            </section>
        </>
    );
}
