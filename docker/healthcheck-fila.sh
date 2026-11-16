#!/bin/sh
# Confirma que existe um processo `php artisan queue:work` ativo, sem
# depender de pacotes extras como procps/pgrep.
for cmdline in /proc/[0-9]*/cmdline; do
    [ -r "$cmdline" ] || continue
    cmd=$(tr '\0' ' ' < "$cmdline" 2>/dev/null)
    case "$cmd" in
        "php artisan queue:work"*) exit 0 ;;
    esac
done

exit 1
