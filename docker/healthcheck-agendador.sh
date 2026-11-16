#!/bin/sh
# Confirma que o processo do scheduler está ativo.
for cmdline in /proc/[0-9]*/cmdline; do
    [ -r "$cmdline" ] || continue
    cmd=$(tr '\0' ' ' < "$cmdline" 2>/dev/null)
    case "$cmd" in
        "php artisan schedule:work"*) exit 0 ;;
    esac
done

exit 1
