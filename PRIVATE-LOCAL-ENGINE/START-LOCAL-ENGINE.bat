@echo off
title B Add Guru Local Engine
cd /d "%~dp0"
where python >nul 2>nul || (echo Python 3 is required.& pause & exit /b)
python -m pip install --quiet pillow psutil
where ffmpeg >nul 2>nul || (echo FFmpeg is required and must be on PATH.& pause & exit /b)
python local_engine.py
pause
