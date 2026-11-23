import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { estaAtivo } from './util';

/**
 * Estado da lista de fluxos: pesquisa, filtro de estado, detalhe e exclusão.
 */
export default function useFluxos(fluxos) {
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [detalhe, setDetalhe] = useState(null);
    const [paraExcluir, setParaExcluir] = useState(null);
    const [excluindo, setExcluindo] = useState(false);

    const totalAtivos = fluxos.filter((fluxo) => estaAtivo(fluxo.ativo)).length;

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLocaleLowerCase('pt-BR');

        return fluxos.filter((fluxo) => {
            const combinaNome = !termo || fluxo.nome.toLocaleLowerCase('pt-BR').includes(termo);
            const combinaEstado = filtro === 'todos'
                || (filtro === 'ativos' && estaAtivo(fluxo.ativo))
                || (filtro === 'inativos' && !estaAtivo(fluxo.ativo));

            return combinaNome && combinaEstado;
        });
    }, [busca, filtro, fluxos]);

    const excluirBloqueado = Boolean(
        paraExcluir && (Number(paraExcluir.execucoes_count) > 0 || Number(paraExcluir.agendamentos_count) > 0),
    );

    const excluir = () => {
        if (!paraExcluir || excluirBloqueado) {
            return;
        }

        router.delete(`/fluxos/${paraExcluir.id}`, {
            preserveScroll: true,
            onStart: () => setExcluindo(true),
            onSuccess: () => {
                setParaExcluir(null);
                toast.success('Fluxo excluído');
            },
            onError: (erros) => {
                toast.error('Não foi possível excluir o fluxo', {
                    description: erros.exclusao ?? 'Os registros vinculados foram preservados.',
                });
            },
            onHttpException: () => {
                toast.error('Não foi possível excluir o fluxo', {
                    description: 'O servidor não confirmou a operação. Atualize a lista antes de tentar novamente.',
                });
            },
            onFinish: () => setExcluindo(false),
        });
    };

    const limparFiltros = () => {
        setBusca('');
        setFiltro('todos');
    };

    return {
        busca,
        alterarBusca: setBusca,
        filtro,
        alterarFiltro: setFiltro,
        filtrados,
        totalAtivos,
        detalhe,
        abrirDetalhe: setDetalhe,
        fecharDetalhe: () => setDetalhe(null),
        paraExcluir,
        pedirExclusao: setParaExcluir,
        fecharExclusao: () => setParaExcluir(null),
        excluindo,
        excluirBloqueado,
        excluir,
        limparFiltros,
    };
}
