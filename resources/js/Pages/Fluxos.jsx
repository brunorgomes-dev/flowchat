import { useState } from 'react';
import { router } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';

const panelClasses = 'rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5';
const checkboxClasses = 'size-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export default function Fluxos({ fluxos }) {
    const [novoNome, setNovoNome] = useState('');
    const [criandoFluxo, setCriandoFluxo] = useState(false);
    const [erroNovoFluxo, setErroNovoFluxo] = useState(null);

    const criarFluxo = (evento) => {
        evento.preventDefault();
        setErroNovoFluxo(null);
        router.post('/fluxos', { nome: novoNome }, {
            preserveScroll: true,
            onStart: () => setCriandoFluxo(true),
            onError: (erros) => setErroNovoFluxo(erros.nome ?? null),
            onSuccess: () => setNovoNome(''),
            onFinish: () => setCriandoFluxo(false),
        });
    };

    return (
        <div className="min-h-full w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
                <PageHeader
                    eyebrow="Automação"
                    title="Fluxos"
                    description="Configure as etapas e os gatilhos que iniciam cada fluxo."
                />

                <form onSubmit={criarFluxo} className={`${panelClasses} mb-5`}>
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                        Novo fluxo
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Input
                                value={novoNome}
                                onChange={(evento) => {
                                    setNovoNome(evento.target.value);
                                    setErroNovoFluxo(null);
                                }}
                                placeholder="Nome do fluxo"
                                className="h-10 min-w-0 flex-1 bg-background text-sm"
                                aria-invalid={Boolean(erroNovoFluxo)}
                                disabled={criandoFluxo}
                                required
                            />
                            <Button type="submit" disabled={criandoFluxo} className="h-10 w-full sm:w-auto">
                                {criandoFluxo && <LoaderCircle className="animate-spin" />}
                                {criandoFluxo ? 'Criando…' : 'Criar fluxo'}
                            </Button>
                        </div>
                        {erroNovoFluxo && <span role="alert" className="text-xs text-destructive">{erroNovoFluxo}</span>}
                    </label>
                </form>

                {fluxos.length > 0 ? (
                    <div className="space-y-4">
                        {fluxos.map((fluxo) => (
                            <CardFluxo key={fluxo.id} fluxo={fluxo} />
                        ))}
                    </div>
                ) : (
                    <div className={`${panelClasses} border-dashed py-10 text-center`}>
                        <p className="text-sm font-medium text-foreground">Nenhum fluxo cadastrado</p>
                        <p className="mt-1 text-xs text-muted-foreground">Crie um fluxo para começar a configurar as etapas.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function CardFluxo({ fluxo }) {
    const [nome, setNome] = useState(fluxo.nome);
    const [ativo, setAtivo] = useState(fluxo.ativo);
    const [etapas, setEtapas] = useState(
        fluxo.etapas.map((etapa) => ({ texto: etapa.texto, pausa_segundos: etapa.pausa_segundos }))
    );
    const [regras, setRegras] = useState(() => {
        const estados = Object.fromEntries(['novo_contato', 'mensagem_recebida'].map((gatilho) => [gatilho, false]));

        for (const regra of fluxo.regras ?? []) {
            estados[regra.gatilho] = !!regra.ativo;
        }

        return estados;
    });
    const [salvando, setSalvando] = useState(false);
    const [erros, setErros] = useState({});

    const salvar = (evento) => {
        evento.preventDefault();
        setErros({});
        router.put(`/fluxos/${fluxo.id}`, {
            nome,
            ativo,
            etapas,
            regras: Object.entries(regras).map(([gatilho, ativoRegra]) => ({
                gatilho,
                ativo: ativoRegra,
            })),
        }, {
            preserveScroll: true,
            onStart: () => setSalvando(true),
            onError: setErros,
            onFinish: () => setSalvando(false),
        });
    };

    const alternarRegra = (gatilho) => {
        setRegras((estadoAtual) => ({ ...estadoAtual, [gatilho]: !estadoAtual[gatilho] }));
    };

    const adicionarEtapa = () => {
        setEtapas([...etapas, { texto: '', pausa_segundos: 0 }]);
        setErros({});
    };

    const removerEtapa = (indice) => {
        setEtapas(etapas.filter((_, posicao) => posicao !== indice));
        setErros({});
    };

    const atualizarEtapa = (indice, campo, valor) => {
        setEtapas(etapas.map((etapa, posicao) => (
            posicao === indice ? { ...etapa, [campo]: valor } : etapa
        )));
    };

    return (
        <form onSubmit={salvar} className={panelClasses}>
            <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    Nome do fluxo
                    <Input
                        value={nome}
                        onChange={(evento) => {
                            setNome(evento.target.value);
                            setErros((errosAtuais) => ({ ...errosAtuais, nome: null }));
                        }}
                        className="h-10 bg-background text-sm font-medium text-foreground"
                        aria-invalid={Boolean(erros.nome)}
                        disabled={salvando}
                        required
                    />
                    {erros.nome && <span role="alert" className="text-xs text-destructive">{erros.nome}</span>}
                </label>

                <fieldset className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 lg:max-w-[34rem]">
                    <legend className="sr-only">Estado e gatilhos do fluxo</legend>
                    <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                        <input
                            type="checkbox"
                            checked={ativo}
                            onChange={(evento) => setAtivo(evento.target.checked)}
                            disabled={salvando}
                            className={checkboxClasses}
                        />
                        Ativo
                    </label>
                    <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                        <input
                            type="checkbox"
                            checked={regras.novo_contato}
                            onChange={() => alternarRegra('novo_contato')}
                            disabled={salvando}
                            className={checkboxClasses}
                        />
                        Novo contato
                    </label>
                    <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                        <input
                            type="checkbox"
                            checked={regras.mensagem_recebida}
                            onChange={() => alternarRegra('mensagem_recebida')}
                            disabled={salvando}
                            className={checkboxClasses}
                        />
                        Mensagem recebida
                    </label>
                </fieldset>

                <Button type="submit" disabled={salvando} className="h-10 w-full lg:w-auto">
                    {salvando && <LoaderCircle className="animate-spin" />}
                    {salvando ? 'Salvando…' : 'Salvar alterações'}
                </Button>
            </div>

            <div className="pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Etapas</h3>
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {etapas.length} {etapas.length === 1 ? 'etapa' : 'etapas'}
                    </span>
                </div>

                {etapas.length > 0 ? (
                    <ol className="space-y-2">
                        {etapas.map((etapa, indice) => (
                            <li
                                key={indice}
                                className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2 rounded-xl border border-border bg-background p-2 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(8.5rem,auto)_auto] sm:gap-3"
                            >
                                <span className="row-span-3 flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-medium tabular-nums text-muted-foreground sm:row-span-1">
                                    {indice + 1}
                                </span>
                                <div className="col-start-2 min-w-0 sm:col-start-auto">
                                    <Input
                                        value={etapa.texto}
                                        onChange={(evento) => {
                                            atualizarEtapa(indice, 'texto', evento.target.value);
                                            setErros((errosAtuais) => ({ ...errosAtuais, [`etapas.${indice}.texto`]: null }));
                                        }}
                                        placeholder="Mensagem da etapa"
                                        aria-label={`Mensagem da etapa ${indice + 1}`}
                                        aria-invalid={Boolean(erros[`etapas.${indice}.texto`])}
                                        className="h-10 min-w-0 bg-card text-sm"
                                        disabled={salvando}
                                        required
                                    />
                                    {erros[`etapas.${indice}.texto`] && (
                                        <p role="alert" className="mt-1 text-xs text-destructive">
                                            {erros[`etapas.${indice}.texto`]}
                                        </p>
                                    )}
                                </div>
                                <div className="col-start-2 min-w-0 sm:col-start-auto">
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                        Pausa
                                        <Input
                                            type="number"
                                            min="0"
                                            value={etapa.pausa_segundos}
                                            onChange={(evento) => {
                                                atualizarEtapa(indice, 'pausa_segundos', Number(evento.target.value));
                                                setErros((errosAtuais) => ({ ...errosAtuais, [`etapas.${indice}.pausa_segundos`]: null }));
                                            }}
                                            aria-label={`Pausa da etapa ${indice + 1} em segundos`}
                                            aria-invalid={Boolean(erros[`etapas.${indice}.pausa_segundos`])}
                                            className="h-10 w-24 bg-card text-sm tabular-nums"
                                            disabled={salvando}
                                        />
                                        s
                                    </label>
                                    {erros[`etapas.${indice}.pausa_segundos`] && (
                                        <p role="alert" className="mt-1 text-xs text-destructive">
                                            {erros[`etapas.${indice}.pausa_segundos`]}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removerEtapa(indice)}
                                    aria-label={`Remover etapa ${indice + 1}`}
                                    className="col-start-2 w-fit text-destructive hover:bg-destructive/10 hover:text-destructive sm:col-start-auto"
                                    disabled={salvando}
                                >
                                    Remover
                                </Button>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhuma etapa configurada.
                    </div>
                )}

                <Button
                    type="button"
                    variant="outline"
                    onClick={adicionarEtapa}
                    disabled={salvando}
                    className="mt-4 h-10"
                >
                    Adicionar etapa
                </Button>
            </div>
        </form>
    );
}
