#/bin/bash
cloc . --exclude-dir=node_modules,.venv,venv,dist,build,.git,.cache,.next --exclude-ext=json,lock
