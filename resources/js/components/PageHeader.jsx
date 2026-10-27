export function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow && (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro">
                        {eyebrow}
                    </p>
                )}
                <h1 className="mt-1 break-words text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[28px]">
                    {title}
                </h1>
                {description && (
                    <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}
