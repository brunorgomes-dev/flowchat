import { CheckCircle2, CircleDot, LoaderCircle, X } from 'lucide-react';

/**
 * Rodapé do editor com o estado da gravação e o botão de salvar.
 */
export default function BarraAcoesEditor({ estadoGravacao, criando }) {
    return (
        <footer className="v2-editor-fluxo__rodape">
            <div className="v2-editor-fluxo__estado">
                {estadoGravacao === 'a_guardar' && <LoaderCircle className="v2-editor-fluxo__spinner" />}
                {estadoGravacao === 'guardado' && <CheckCircle2 style={{ width: '1rem', height: '1rem', color: 'var(--v2-verde)' }} />}
                {estadoGravacao === 'alterado' && <CircleDot style={{ width: '1rem', height: '1rem', color: 'var(--v2-ink-2)' }} />}
                {estadoGravacao === 'erro' && <X style={{ width: '1rem', height: '1rem', color: 'var(--v2-perigo)' }} />}
                <span className={estadoGravacao === 'erro' ? 'v2-editor-fluxo__estado--erro' : ''}>
                    {estadoGravacao === 'guardado' ? 'Salvo com sucesso' : estadoGravacao === 'a_guardar' ? 'Salvando…' : estadoGravacao === 'erro' ? 'Revise os campos antes de salvar' : 'Alterações não salvas'}
                </span>
            </div>
            <button type="submit" disabled={estadoGravacao === 'a_guardar'} className="v2-btn v2-btn--primario">
                {estadoGravacao === 'a_guardar' && <LoaderCircle className="v2-editor-fluxo__spinner" />}
                {estadoGravacao === 'a_guardar' ? 'Salvando…' : criando ? 'Criar fluxo' : 'Salvar alterações'}
            </button>
        </footer>
    );
}
