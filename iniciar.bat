@echo off
echo TechFatec em http://localhost:8000
start "" http://localhost:8000
python -m http.server 8000
