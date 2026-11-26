#!/bin/sh
# Regenerates dark.html from index.html (run after editing slides).
cd "$(dirname "$0")"
sed 's|<script>/\* theme before first paint|<script>window.DECK_THEME="dark";</script>\n<script>/* theme before first paint|' index.html > dark.html
