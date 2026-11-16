#!/bin/sh
# Verifica o endpoint de saúde do Laravel, não apenas a porta TCP.
php -r 'exit(@file_get_contents("http://127.0.0.1/up") === false ? 1 : 0);'
