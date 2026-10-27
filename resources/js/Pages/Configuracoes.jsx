import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SeletorTema } from '@/components/SeletorTema';
import { definirPreferenciaTema, lerPreferenciaTema } from '@/lib/tema';

export default function Configuracoes() {
    const [preferenciaTema, setPreferenciaTema] = useState(lerPreferenciaTema);

    const alterarPreferenciaTema = (preferencia) => {
        setPreferenciaTema(preferencia);
        definirPreferenciaTema(preferencia);
    };

    return (
        <div className="min-h-full w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">
                <PageHeader
                    eyebrow="Preferências"
                    title="Configurações"
                    description="Ajuste a aparência do FlowChat para combinar com seu ambiente de trabalho."
                />

                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border px-5 py-4 sm:px-6 sm:py-5">
                        <h2 id="preferencia-tema-titulo" className="text-sm font-semibold text-foreground">
                            Aparência
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Escolha um tema fixo ou acompanhe a preferência do sistema.
                        </p>
                    </div>
                    <div className="p-5 sm:p-6">
                        <SeletorTema
                            valor={preferenciaTema}
                            aoAlterar={alterarPreferenciaTema}
                        />
                        <p className="mt-4 text-xs text-muted-foreground">
                            A preferência fica salva neste navegador.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
