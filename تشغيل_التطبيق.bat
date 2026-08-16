@echo off
rem تشغيل التطبيق من المجلد الرئيسي بدون إنترنت بعد تثبيت الاعتمادات
pushd "%~dp0"
setlocal

rem حاول استخدام Node محلي أولاً ثم نظامي
set "PORTABLE_NODE=%~dp0nodejs\node.exe"
set "NODE_HOME=C:\Program Files\nodejs"
if exist "%PORTABLE_NODE%" (
  set "NODE_EXE=%PORTABLE_NODE%"
) else if exist "%NODE_HOME%\node.exe" (
  set "NODE_EXE=%NODE_HOME%\node.exe"
) else (
  for %%I in (node.exe) do if exist "%%~$PATH:I" set "NODE_EXE=%%~$PATH:I"
)

rem حاول استخدام pnpm محلي أو نظامي
set "LOCAL_PNPM=%~dp0node_modules\.bin\pnpm.cmd"
set "GLOBAL_PNPM=%USERPROFILE%\AppData\Roaming\npm\pnpm.cmd"
if exist "%GLOBAL_PNPM%" (
  set "PNPM_CMD=%GLOBAL_PNPM%"
) else if exist "%LOCAL_PNPM%" (
  set "PNPM_CMD=%LOCAL_PNPM%"
) else (
  for %%I in (pnpm.cmd) do if exist "%%~$PATH:I" set "PNPM_CMD=%%~$PATH:I"
)

if not defined NODE_EXE (
  echo.
  echo لم يتم العثور على Node.js. يجب تثبيته لتشغيل التطبيق.
  echo الرجاء تثبيت Node.js من الموقع الرسمي ثم إعادة المحاولة.
  pause
  goto :end
)

if not defined PNPM_CMD (
  echo.
  echo لم يتم العثور على pnpm.
  echo حاول تثبيته عالمياً عبر:
  echo npm install -g pnpm
  echo أو انسخ مجلد pnpm إلى %USERPROFILE%\AppData\Roaming\npm
  pause
  goto :end
)

rem إذا كان البناء موجودًا، استخدم ملف run-offline مباشرة
if exist "%~dp0run-offline.mjs" (
  "%NODE_EXE%" "%~dp0run-offline.mjs"
  if errorlevel 1 (
    echo.
    echo حدث خطأ أثناء تشغيل التطبيق المحسّن بدون إنترنت.
    pause
  )
  goto :end
)

rem إذا لم يكن ملف run-offline موجودًا، حاول تشغيل desktop الافتراضي
echo تشغيل التطبيق الآن...
"%PNPM_CMD%" run desktop
if errorlevel 1 (
  echo.
  echo حدث خطأ أثناء تشغيل التطبيق.
  pause
)

:end
endlocal
popd
