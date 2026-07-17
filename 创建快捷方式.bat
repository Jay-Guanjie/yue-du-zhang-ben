@echo off
set SCRIPT="%TEMP%\mklnk.vbs"
echo Set WshShell = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo Set Shortcut = WshShell.CreateShortcut("%USERPROFILE%\Desktop\月度账本.lnk") >> %SCRIPT%
echo Shortcut.TargetPath = "%~dp0启动账本.bat" >> %SCRIPT%
echo Shortcut.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo Shortcut.Description = "月度账本 - 2026" >> %SCRIPT%
echo Shortcut.IconLocation = "%%SystemRoot%%\system32\SHELL32.dll,167" >> %SCRIPT%
echo Shortcut.WindowStyle = 1 >> %SCRIPT%
echo Shortcut.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%
if exist "%USERPROFILE%\Desktop\月度账本.lnk" (
  echo ✅ 桌面快捷方式已创建成功！
) else (
  echo ❌ 创建失败
)
pause
